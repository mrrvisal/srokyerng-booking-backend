ALTER TABLE payments
ADD COLUMN rejection_reason TEXT NULL AFTER transaction_reference;
