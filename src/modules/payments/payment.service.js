const path = require("path");
const fs = require("fs");
const pool = require("../../config/db");
const paymentModel = require("./payment.model");
const propertyModel = require("../properties/property.model");
const { isValidTransition } = require("./payment.validation");
const signedFileUrl = require("../../utils/signedFileUrl");

// ─── Helpers ──────────────────────────────────────────────────────

// Runs fn inside a DB transaction on a dedicated connection, committing on
// success and rolling back on any thrown error. Used for payment/refund
// status transitions so concurrent requests on the same row serialize
// instead of racing (see lockPaymentById / lockRefundRequestById).
const withTransaction = async (fn) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const toSafePayment = (row) => ({
  id: row.id,
  reservation_id: row.reservation_id,
  customer_id: row.customer_id,
  owner_id: row.owner_id,
  amount: row.amount,
  currency: row.currency,
  transaction_reference: row.transaction_reference,
  rejection_reason: row.rejection_reason,
  receipt_image_url: signedFileUrl.sign(row.receipt_image_url),
  payment_status: row.status_name,
  payment_method: row.method_name,
  payment_method_id: row.payment_method_id,
  payment_status_id: row.payment_status_id,
  verified_by: row.verified_by,
  verified_by_name: row.verified_by_name,
  verified_at: row.verified_at,
  paid_at: row.paid_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  customer_name: row.customer_name,
  customer_email: row.customer_email,
  customer_phone: row.customer_phone,
  check_in_date: row.check_in_date,
  check_out_date: row.check_out_date,
  total_nights: row.total_nights,
  reservation_status: row.reservation_status,
  room_name: row.room_name,
  property_name: row.property_name,
  property_id: row.property_id,
  owner_payment_account_id: row.owner_payment_account_id,
  account_name: row.account_name,
  account_number: row.account_number,
  qr_image_url: row.qr_image_url,
});

const throwError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

// ─── Create Payment ───────────────────────────────────────────────

const createPayment = async (
  customerId,
  { reservation_id, payment_method_id, owner_payment_account_id, transaction_reference }
) => {
  // 1. Reservation must exist
  const reservation = await paymentModel.findReservationById(reservation_id);
  if (!reservation) throwError("Reservation not found", 404);

  // 2. Reservation must belong to this customer
  if (reservation.customer_id !== customerId) {
    throwError("You can only pay for your own reservations", 403);
  }

  // 3. Reservation must be in a payable state (confirmed or pending)
  const payableStatuses = ["pending", "confirmed"];
  if (!payableStatuses.includes(reservation.reservation_status)) {
    throwError(
      `Cannot create payment for a reservation with status: ${reservation.reservation_status}`,
      400
    );
  }

  // 4. No duplicate payment
  const existing = await paymentModel.findExistingPaymentForReservation(reservation_id);
  if (existing) throwError("A payment record already exists for this reservation", 409);

  // 5. Payment method must exist and be active
  const method = await paymentModel.findPaymentMethodById(payment_method_id);
  if (!method) throwError("Payment method not found or inactive", 400);

  if (owner_payment_account_id) {
    const ownerPaymentAccount = await paymentModel.findOwnerPaymentAccountById(
      owner_payment_account_id
    );

    if (!ownerPaymentAccount) {
      throwError("Owner payment account not found or inactive", 400);
    }

    if (ownerPaymentAccount.owner_id !== reservation.owner_id) {
      throwError(
        "Owner payment account does not belong to the reservation property owner",
        403
      );
    }

    if (ownerPaymentAccount.payment_method_id !== payment_method_id) {
      throwError("Selected owner payment account does not match the payment method", 400);
    }
  }

  // 6. Status starts as "pending"
  const pendingStatus = await paymentModel.findPaymentStatusByName("pending");
  if (!pendingStatus) throwError("Payment statuses not seeded", 500);

  // 7. Amount must match reservation total
  const amount = parseFloat(reservation.total_amount);

  const paymentId = await paymentModel.createPayment({
    reservationId: reservation_id,
    customerId,
    ownerId: reservation.owner_id,
    paymentMethodId: payment_method_id,
    ownerPaymentAccountId: owner_payment_account_id,
    paymentStatusId: pendingStatus.id,
    amount,
    transactionReference: transaction_reference || null,
  });

  const payment = await paymentModel.findPaymentById(paymentId);
  return toSafePayment(payment);
};

// ─── Upload Receipt ───────────────────────────────────────────────

const uploadReceipt = async (customerId, paymentId, file, transactionReference) => {
  if (!file) throwError("No receipt file provided", 400);

  const payment = await paymentModel.findPaymentById(paymentId);
  if (!payment) throwError("Payment not found", 404);

  if (payment.customer_id !== customerId) {
    throwError("You can only upload receipts for your own payments", 403);
  }

  // Only allow upload when payment is pending, submitted (re-upload), or failed (replace after rejection)
  const uploadableStatuses = ["pending", "submitted", "failed"];
  if (!uploadableStatuses.includes(payment.status_name)) {
    throwError(
      `Cannot upload receipt for a payment with status: ${payment.status_name}`,
      400
    );
  }

  // Move file to permanent location (multer already saved it to uploads/receipts)
  const receiptUrl = `/uploads/receipts/${file.filename}`;

  // Remove old receipt file if re-uploading
  if (payment.receipt_image_url) {
    const oldPath = path.join(
      process.cwd(),
      payment.receipt_image_url.replace(/^\//, "")
    );
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  // Status transitions to "submitted" once receipt is uploaded
  const submittedStatus = await paymentModel.findPaymentStatusByName("submitted");
  if (!submittedStatus) throwError("Payment statuses not seeded", 500);

  const trimmedReference =
    typeof transactionReference === "string" ? transactionReference.trim().slice(0, 255) : "";

  await paymentModel.updateReceiptUrl(
    paymentId,
    receiptUrl,
    submittedStatus.id,
    trimmedReference || null
  );

  const updated = await paymentModel.findPaymentById(paymentId);
  return toSafePayment(updated);
};

// ─── Customer Views ───────────────────────────────────────────────

const getMyPayments = async (customerId, filters = {}) => {
  const rows = await paymentModel.findPaymentsByCustomer(customerId, filters);
  return rows.map(toSafePayment);
};

const toSafeOwnerPaymentAccount = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    owner_id: row.owner_id,
    payment_method_id: row.payment_method_id,
    payment_method_name: row.method_name,
    account_name: row.account_name,
    account_number: row.account_number,
    qr_image_url: row.qr_image_url,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const getReservationOwnerPaymentAccounts = async (customerId, reservationId) => {
  const reservation = await paymentModel.findReservationById(reservationId);
  if (!reservation) throwError("Reservation not found", 404);
  if (reservation.customer_id !== customerId) {
    throwError("You can only view payment accounts for your own reservations", 403);
  }

  const accounts = await paymentModel.findActiveOwnerPaymentAccountsByOwnerId(
    reservation.owner_id
  );

  return accounts.map(toSafeOwnerPaymentAccount);
};

const getOwnerPaymentAccounts = async (ownerId) => {
  const accounts = await paymentModel.findOwnerPaymentAccountsByOwnerId(ownerId);
  return accounts.map(toSafeOwnerPaymentAccount);
};

const createOwnerPaymentAccount = async (
  ownerId,
  { payment_method_id, account_name, account_number, qr_image_url }
) => {
  if (!account_name || account_name.trim().length === 0) {
    throwError("Account name is required", 400);
  }

  if (!account_number && !qr_image_url) {
    throwError(
      "At least one payment detail is required: account number or QR image",
      400
    );
  }

  const paymentMethod = await paymentModel.findPaymentMethodById(payment_method_id);
  if (!paymentMethod) {
    throwError("Payment method not found or inactive", 400);
  }

  const duplicate = await paymentModel.findOwnerActivePaymentAccountByOwnerAndMethod(
    ownerId,
    payment_method_id
  );
  if (duplicate) {
    throwError("An active payment account already exists for this payment method", 409);
  }

  const insertId = await paymentModel.createOwnerPaymentAccount({
    ownerId,
    paymentMethodId: payment_method_id,
    accountName: account_name.trim(),
    accountNumber: account_number ? account_number.trim() : null,
    qrImageUrl: qr_image_url || null,
    isActive: true,
  });

  const row = await paymentModel.findOwnerPaymentAccountById(insertId, false);
  return toSafeOwnerPaymentAccount(row);
};

const updateOwnerPaymentAccount = async (ownerId, accountId, payload) => {
  const { payment_method_id, account_name, account_number, qr_image_url } = payload;
  const account = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  if (!account) throwError("Owner payment account not found", 404);

  if (account.owner_id !== ownerId) {
    throwError("You can only manage your own payment accounts", 403);
  }

  const updates = {};
  if (payment_method_id && payment_method_id !== account.payment_method_id) {
    const paymentMethod = await paymentModel.findPaymentMethodById(payment_method_id);
    if (!paymentMethod) {
      throwError("Payment method not found or inactive", 400);
    }
    const duplicate = await paymentModel.findOwnerActivePaymentAccountByOwnerAndMethod(
      ownerId,
      payment_method_id
    );
    if (duplicate && duplicate.id !== account.id) {
      throwError("An active payment account already exists for this payment method", 409);
    }
    updates.payment_method_id = payment_method_id;
  }

  if (Object.hasOwn(payload, "account_name")) {
    if (!account_name || account_name.trim().length === 0) {
      throwError("Account name is required", 400);
    }
    updates.account_name = account_name.trim();
  }

  if (Object.hasOwn(payload, "account_number")) {
    updates.account_number = account_number ? account_number.trim() : null;
  }

  if (Object.hasOwn(payload, "qr_image_url")) {
    updates.qr_image_url = qr_image_url || null;
  }

  const finalAccountNumber = Object.hasOwn(updates, "account_number")
    ? updates.account_number
    : account.account_number;
  const finalQrImageUrl = Object.hasOwn(updates, "qr_image_url")
    ? updates.qr_image_url
    : account.qr_image_url;
  const finalAccountName = Object.hasOwn(updates, "account_name")
    ? updates.account_name
    : account.account_name;

  if (!finalAccountName || finalAccountName.trim().length === 0) {
    throwError("Account name is required", 400);
  }

  if (!finalAccountNumber && !finalQrImageUrl) {
    throwError(
      "At least one payment detail is required: account number or QR image",
      400
    );
  }

  if (
    updates.qr_image_url &&
    account.qr_image_url &&
    account.qr_image_url !== updates.qr_image_url
  ) {
    const oldPath = path.join(process.cwd(), account.qr_image_url.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  await paymentModel.updateOwnerPaymentAccount(accountId, updates);
  const updated = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  return toSafeOwnerPaymentAccount(updated);
};

const activateOwnerPaymentAccount = async (ownerId, accountId) => {
  const account = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  if (!account) throwError("Owner payment account not found", 404);
  if (account.owner_id !== ownerId) {
    throwError("You can only manage your own payment accounts", 403);
  }

  if (account.is_active) {
    return toSafeOwnerPaymentAccount(account);
  }

  const duplicate = await paymentModel.findOwnerActivePaymentAccountByOwnerAndMethod(
    ownerId,
    account.payment_method_id
  );
  if (duplicate && duplicate.id !== account.id) {
    throwError("An active payment account already exists for this payment method", 409);
  }

  await paymentModel.setOwnerPaymentAccountActive(accountId, true);
  const updated = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  return toSafeOwnerPaymentAccount(updated);
};

const deactivateOwnerPaymentAccount = async (ownerId, accountId) => {
  const account = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  if (!account) throwError("Owner payment account not found", 404);
  if (account.owner_id !== ownerId) {
    throwError("You can only manage your own payment accounts", 403);
  }

  await paymentModel.setOwnerPaymentAccountActive(accountId, false);
  const updated = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  return toSafeOwnerPaymentAccount(updated);
};

const deleteOwnerPaymentAccount = async (ownerId, accountId) => {
  const account = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  if (!account) throwError("Owner payment account not found", 404);
  if (account.owner_id !== ownerId) {
    throwError("You can only manage your own payment accounts", 403);
  }

  // Nullify the reference in any payments that use this account
  // so the foreign key constraint does not block the delete
  await paymentModel.nullifyOwnerPaymentAccountOnPayments(accountId);

  // Delete the QR image file if it exists
  if (account.qr_image_url) {
    const qrPath = path.join(process.cwd(), account.qr_image_url.replace(/^\//, ""));
    if (fs.existsSync(qrPath)) {
      fs.unlinkSync(qrPath);
    }
  }

  const deleted = await paymentModel.deleteOwnerPaymentAccount(accountId);
  if (!deleted) throwError("Owner payment account not found", 404);

  return { id: accountId, deleted: true };
};

const getPropertyPaymentAccounts = async (propertyId) => {
  const property = await propertyModel.findPropertyById(propertyId);
  if (!property) throwError("Property not found", 404);

  const accounts = await paymentModel.findActiveOwnerPaymentAccountsByOwnerId(
    property.owner_id
  );
  return accounts.map(toSafeOwnerPaymentAccount);
};

const getAdminOwnerPaymentAccounts = async (filters = {}) => {
  const accounts = await paymentModel.findOwnerPaymentAccounts(filters);
  return accounts.map(toSafeOwnerPaymentAccount);
};

const getAdminOwnerPaymentAccountById = async (accountId) => {
  const account = await paymentModel.findOwnerPaymentAccountById(accountId, false);
  if (!account) throwError("Owner payment account not found", 404);
  return toSafeOwnerPaymentAccount(account);
};

const getOwnerPayments = async (ownerId, filters = {}) => {
  const rows = await paymentModel.findPaymentsByOwner(ownerId, filters);
  return rows.map(toSafePayment);
};

const getPaymentById = async (paymentId, requestingUserId, requestingUserRole) => {
  const payment = await paymentModel.findPaymentById(paymentId);
  if (!payment) throwError("Payment not found", 404);

  const isAdmin = requestingUserRole === "admin";
  const isCustomer = payment.customer_id === requestingUserId;
  const isOwner = requestingUserRole === "owner" && payment.owner_id === requestingUserId;

  if (!isAdmin && !isCustomer && !isOwner) {
    throwError("You do not have permission to view this payment", 403);
  }

  return toSafePayment(payment);
};

// ─── Owner Actions ───────────────────────────────────────────────

// Locks the payment row, validates ownership + the status transition, applies
// it, and returns the pre-update locked row (still useful for fields like
// reservation_id that don't change).
const _lockedTransition = (ownerId, paymentId, targetStatus, extraFields = {}) =>
  withTransaction(async (connection) => {
    const payment = await paymentModel.lockPaymentById(connection, paymentId);
    if (!payment) throwError("Payment not found", 404);
    if (payment.owner_id !== ownerId) {
      throwError("You can only manage payments for your own properties", 403);
    }

    if (!isValidTransition(payment.status_name, targetStatus)) {
      throwError(
        `Cannot transition payment from '${payment.status_name}' to '${targetStatus}'`,
        400
      );
    }

    const statusRow = await paymentModel.findPaymentStatusByName(targetStatus);
    if (!statusRow) throwError("Payment statuses not seeded", 500);

    await paymentModel.updatePaymentStatus(payment.id, statusRow.id, extraFields, connection);

    return payment;
  });

const verifyPayment = async (ownerId, paymentId) => {
  const now = new Date();

  const lockedPayment = await _lockedTransition(ownerId, paymentId, "paid", {
    verified_by: ownerId,
    verified_at: now,
    paid_at: now,
  });

  // Update reservation status to confirmed
  const reservationModel = require("../reservations/reservation.model");
  await reservationModel.updateReservationStatus(
    lockedPayment.reservation_id,
    "confirmed"
  );

  const updated = await paymentModel.findPaymentById(paymentId);
  return toSafePayment(updated);
};

const rejectPayment = async (ownerId, paymentId, rejectionReason) => {
  const lockedPayment = await _lockedTransition(ownerId, paymentId, "failed", {
    verified_by: ownerId,
    verified_at: new Date(),
    rejection_reason: rejectionReason || null,
  });

  // A rejected payment means the hold was never valid — free the room
  // immediately instead of leaving it blocked until the 48h pending-expiry
  // job runs.
  const reservationModel = require("../reservations/reservation.model");
  const reservation = await reservationModel.findReservationById(
    lockedPayment.reservation_id
  );
  if (reservation && reservation.reservation_status === "pending") {
    await reservationModel.updateReservationStatus(
      lockedPayment.reservation_id,
      "cancelled",
      rejectionReason ? `Payment rejected: ${rejectionReason}` : "Payment rejected by owner"
    );
  }

  const updated = await paymentModel.findPaymentById(paymentId);
  return toSafePayment(updated);
};

const refundPayment = async (ownerId, paymentId) => {
  // Early check outside the transaction so an obviously invalid request
  // (unknown payment, wrong owner, reservation not cancelled) doesn't need
  // to open one at all.
  const payment = await paymentModel.findPaymentById(paymentId);
  if (!payment) throwError("Payment not found", 404);
  if (payment.owner_id !== ownerId) {
    throwError("You can only manage payments for your own properties", 403);
  }

  const reservationModel = require("../reservations/reservation.model");
  const reservation = await reservationModel.findReservationById(payment.reservation_id);
  if (!reservation) throwError("Associated reservation not found", 404);
  if (reservation.reservation_status !== "cancelled") {
    throwError("Can only refund payments for cancelled reservations", 400);
  }

  await _lockedTransition(ownerId, paymentId, "refunded", {
    verified_by: ownerId,
    verified_at: new Date(),
  });

  const updated = await paymentModel.findPaymentById(paymentId);
  return toSafePayment(updated);
};

const getAllPayments = async (filters = {}) => {
  const rows = await paymentModel.findAllPayments(filters);
  return rows.map(toSafePayment);
};

const getPaymentsPendingVerification = async () => {
  const rows = await paymentModel.findAllPayments({ status: "submitted" });
  return rows.map(toSafePayment);
};

const getOwnerPaymentsPendingVerification = async (ownerId) => {
  const rows = await paymentModel.findPaymentsByOwner(ownerId, { status: "submitted" });
  return rows.map(toSafePayment);
};

// ─── Refund Request Actions ───────────────────────────────────────

const createRefundRequest = async (paymentId, requestedBy, amount, reason) => {
  const refundRequestModel = require("./refund-request.model");

  const payment = await paymentModel.findPaymentById(paymentId);
  if (!payment) throwError("Payment not found", 404);

  if (payment.customer_id !== requestedBy) {
    throwError("You can only request a refund for your own payments", 403);
  }

  if (payment.status_name !== "paid") {
    throwError("Only paid payments can be refunded", 400);
  }

  const existingRefund =
    await refundRequestModel.findRefundRequestsByPaymentId(paymentId);
  if (existingRefund.length > 0) {
    const pending = existingRefund.find((r) => r.refund_status === "requested");
    if (pending) {
      throwError("A refund request already exists for this payment", 409);
    }
  }

  if (amount > payment.amount) {
    throwError("Refund amount cannot exceed payment amount", 400);
  }

  const insertId = await refundRequestModel.createRefundRequest(
    paymentId,
    requestedBy,
    amount,
    reason
  );

  const refundRequest = await refundRequestModel.findRefundRequestById(insertId);
  return {
    id: refundRequest.id,
    payment_id: refundRequest.payment_id,
    requested_by: refundRequest.requested_by,
    amount: refundRequest.amount,
    reason: refundRequest.reason,
    refund_status: refundRequest.refund_status,
    requested_at: refundRequest.requested_at,
  };
};

const createRefundRequestByReservation = async (reservationId, customerId, amount, reason) => {
  const refundRequestModel = require("./refund-request.model");

  // Find payment by reservation ID
  const payment = await paymentModel.findPaymentByReservationId(reservationId);
  if (!payment) throwError("No payment found for this reservation", 404);

  // Verify customer owns this reservation/payment
  if (payment.customer_id !== customerId) {
    throwError("You can only request refunds for your own reservations", 403);
  }

  if (payment.status_name !== "paid") {
    throwError("Only paid payments can be refunded", 400);
  }

  const existingRefund =
    await refundRequestModel.findRefundRequestsByPaymentId(payment.id);
  if (existingRefund.length > 0) {
    const pending = existingRefund.find((r) => r.refund_status === "requested");
    if (pending) {
      throwError("A refund request already exists for this payment", 409);
    }
  }

  if (amount > payment.amount) {
    throwError("Refund amount cannot exceed payment amount", 400);
  }

  const insertId = await refundRequestModel.createRefundRequest(
    payment.id,
    customerId,
    amount,
    reason
  );

  const refundRequest = await refundRequestModel.findRefundRequestById(insertId);
  return {
    id: refundRequest.id,
    payment_id: refundRequest.payment_id,
    requested_by: refundRequest.requested_by,
    amount: refundRequest.amount,
    reason: refundRequest.reason,
    refund_status: refundRequest.refund_status,
    requested_at: refundRequest.requested_at,
  };
};

const getMyRefundRequests = async (userId, limit = 50) => {
  const refundRequestModel = require("./refund-request.model");

  const refundRequests = await refundRequestModel.findRefundRequestsByUserId(
    userId,
    limit
  );

  return refundRequests.map((r) => ({
    id: r.id,
    payment_id: r.payment_id,
    amount: r.amount,
    reason: r.reason,
    refund_status: r.refund_status,
    requested_at: r.requested_at,
    handled_at: r.handled_at,
  }));
};

const getOwnerRefundRequestById = async (ownerId, refundRequestId) => {
  const refundRequestModel = require("./refund-request.model");

  const refundRequest = await refundRequestModel.findRefundRequestById(refundRequestId);
  if (!refundRequest) throwError("Refund request not found", 404);

  // Verify the refund request belongs to the owner's property
  const payment = await paymentModel.findPaymentById(refundRequest.payment_id);
  if (!payment) throwError("Payment not found", 404);
  if (payment.owner_id !== ownerId) {
    throwError("You can only view refund requests for your own properties", 403);
  }

  // Fetch enriched details similar to the list endpoint
  const enriched = await refundRequestModel.findRefundRequestsByOwner(ownerId, 1, refundRequestId);
  if (enriched.length === 0) {
    // Fallback to basic data if enriched query fails
    return {
      id: refundRequest.id,
      payment_id: refundRequest.payment_id,
      amount: refundRequest.amount,
      reason: refundRequest.reason,
      refund_status: refundRequest.refund_status,
      decision_note: refundRequest.decision_note,
      requested_by: refundRequest.requested_by,
      handled_by: refundRequest.handled_by,
      requested_at: refundRequest.requested_at,
      handled_at: refundRequest.handled_at,
    };
  }

  return enriched[0];
};

const getOwnerRefundRequests = async (ownerId, limit = 50) => {
  const refundRequestModel = require("./refund-request.model");

  const refundRequests = await refundRequestModel.findRefundRequestsByOwner(
    ownerId,
    limit
  );

  return refundRequests.map((r) => ({
    id: r.id,
    payment_id: r.payment_id,
    payment_amount: r.payment_amount,
    reservation_id: r.reservation_id,
    customer_name: r.customer_name,
    property_name: r.property_name,
    room_name: r.room_name,
    check_in_date: r.check_in_date,
    check_out_date: r.check_out_date,
    decision_note: r.decision_note,
    reservation_status: r.reservation_status,
    amount: r.amount,
    reason: r.reason,
    refund_status: r.refund_status,
    requested_at: r.requested_at,
    handled_at: r.handled_at,
  }));
};

const getOwnerPendingRefundRequests = async (ownerId, limit = 50) => {
  const refundRequestModel = require("./refund-request.model");

  const refundRequests = await refundRequestModel.findPendingRefundRequestsByOwner(
    ownerId,
    limit
  );

  return refundRequests.map((r) => ({
    id: r.id,
    payment_id: r.payment_id,
    payment_amount: r.payment_amount,
    reservation_id: r.reservation_id,
    customer_name: r.customer_name,
    property_name: r.property_name,
    room_name: r.room_name,
    check_in_date: r.check_in_date,
    check_out_date: r.check_out_date,
    reservation_status: r.reservation_status,
    amount: r.amount,
    reason: r.reason,
    refund_status: r.refund_status,
    requested_at: r.requested_at,
  }));
};

const approveOwnerRefundRequest = async (ownerId, refundRequestId = "") => {
  const refundRequestModel = require("./refund-request.model");

  await withTransaction(async (connection) => {
    const refundRequest = await refundRequestModel.lockRefundRequestById(
      connection,
      refundRequestId
    );
    if (!refundRequest) throwError("Refund request not found", 404);
    if (refundRequest.refund_status !== "requested") {
      throwError("Only pending refund requests can be approved", 400);
    }

    // Verify the refund request belongs to the owner's property
    const payment = await paymentModel.lockPaymentById(connection, refundRequest.payment_id);
    if (!payment) throwError("Payment not found", 404);
    if (payment.owner_id !== ownerId) {
      throwError("You can only manage refund requests for your own properties", 403);
    }
    if (payment.status_name !== "paid") {
      throwError("Payment is no longer in paid status", 400);
    }

    await refundRequestModel.updateRefundRequestStatus(
      refundRequestId,
      "approved",
      ownerId,
      "",
      connection
    );

    const statusRow = await paymentModel.findPaymentStatusByName("refunded");
    if (!statusRow) throwError("Payment statuses not seeded", 500);

    await paymentModel.updatePaymentStatus(payment.id, statusRow.id, {
      verified_by: ownerId,
      verified_at: new Date(),
    }, connection);
  });

  const updatedRefundRequest =
    await refundRequestModel.findRefundRequestById(refundRequestId);
  return {
    id: updatedRefundRequest.id,
    payment_id: updatedRefundRequest.payment_id,
    refund_status: updatedRefundRequest.refund_status,
    handled_by: updatedRefundRequest.handled_by,
    handled_at: updatedRefundRequest.handled_at,
  };
};

const rejectOwnerRefundRequest = async (ownerId, refundRequestId, decisionNote = "") => {
  const refundRequestModel = require("./refund-request.model");

  await withTransaction(async (connection) => {
    const refundRequest = await refundRequestModel.lockRefundRequestById(
      connection,
      refundRequestId
    );
    if (!refundRequest) throwError("Refund request not found", 404);
    if (refundRequest.refund_status !== "requested") {
      throwError("Only pending refund requests can be rejected", 400);
    }

    // Verify the refund request belongs to the owner's property
    const payment = await paymentModel.lockPaymentById(connection, refundRequest.payment_id);
    if (!payment) throwError("Payment not found", 404);
    if (payment.owner_id !== ownerId) {
      throwError("You can only manage refund requests for your own properties", 403);
    }

    await refundRequestModel.updateRefundRequestStatus(
      refundRequestId,
      "rejected",
      ownerId,
      decisionNote,
      connection
    );
  });

  const updatedRefundRequest =
    await refundRequestModel.findRefundRequestById(refundRequestId);
  return {
    id: updatedRefundRequest.id,
    payment_id: updatedRefundRequest.payment_id,
    refund_status: updatedRefundRequest.refund_status,
    handled_by: updatedRefundRequest.handled_by,
    handled_at: updatedRefundRequest.handled_at,
  };
};

module.exports = {
  createPayment,
  uploadReceipt,
  getMyPayments,
  getReservationOwnerPaymentAccounts,
  getOwnerPaymentAccounts,
  createOwnerPaymentAccount,
  updateOwnerPaymentAccount,
  activateOwnerPaymentAccount,
  deactivateOwnerPaymentAccount,
  deleteOwnerPaymentAccount,
  getPropertyPaymentAccounts,
  getAdminOwnerPaymentAccounts,
  getAdminOwnerPaymentAccountById,
  getOwnerPayments,
  getPaymentById,
  verifyPayment,
  rejectPayment,
  refundPayment,
  getAllPayments,
  getPaymentsPendingVerification,
  getOwnerPaymentsPendingVerification,
  createRefundRequest,
  createRefundRequestByReservation,
  getMyRefundRequests,
  getOwnerRefundRequestById,
  getOwnerRefundRequests,
  getOwnerPendingRefundRequests,
  approveOwnerRefundRequest,
  rejectOwnerRefundRequest,
};
