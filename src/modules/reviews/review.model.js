const db = require("../../config/db");
const AppError = require("../../utils/appError");

const getRoomById = async (roomId) => {

    const [rooms] = await db.query(
        `
        SELECT *
        FROM rooms
        WHERE id = ?
        `,
        [roomId]
    );

    return rooms[0];
};

const insertReview = async (
    reservationId,
    propertyId,
    userId,
    rating,
    comment
) => {
    try {
        const [result] = await db.query(
            `
            INSERT INTO reviews (
                reservation_id,
                property_id,
                customer_id,
                rating,
                comment
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                reservationId,
                propertyId,
                userId,
                rating,
                comment
            ]
        );

        return result.insertId;
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            throw new AppError(
                "Review already exists for this reservation",
                400
            );
        }
        throw error;
    }
};

const getReviewById = async (reviewId) => {

    const [reviews] = await db.query(
        `
        SELECT
            reviews.*,
            properties.property_name,
            properties.owner_id,
            rooms.room_name,
            reservations.check_in_date,
            reservations.check_out_date
        FROM reviews
        JOIN reservations
            ON reviews.reservation_id = reservations.id
        JOIN rooms
            ON reservations.room_id = rooms.id
        JOIN properties
            ON reviews.property_id = properties.id
        WHERE reviews.id = ?
        `,
        [reviewId]
    );

    return reviews[0];
};

const getPropertyReviews = async (propertyId) => {

    const [reviews] = await db.query(
        `
        SELECT
            reviews.id,
            reviews.rating,
            reviews.comment,
            reviews.owner_reply,
            reviews.replied_by,
            reviews.replied_at,
            reviews.created_at,
            users.full_name,
            rooms.room_name
        FROM reviews
        JOIN users
            ON reviews.customer_id = users.id
        JOIN reservations
            ON reviews.reservation_id = reservations.id
        JOIN rooms
            ON reservations.room_id = rooms.id
        WHERE reviews.property_id = ?
        ORDER BY reviews.created_at DESC
        `,
        [propertyId]
    );

    return reviews;
};
const getMyReviews = async (userId) => {

    const [reviews] = await db.query(
        `
        SELECT
            reviews.*,
            properties.property_name,
            rooms.room_name,
            reservations.check_in_date,
            reservations.check_out_date
        FROM reviews
        JOIN reservations
            ON reviews.reservation_id = reservations.id
        JOIN rooms
            ON reservations.room_id = rooms.id
        JOIN properties
            ON reviews.property_id = properties.id
        WHERE reviews.customer_id = ?
        ORDER BY reviews.created_at DESC
        `,
        [userId]
    );

    return reviews;
};
const getOwnerReviews = async (ownerId) => {
    const [reviews] = await db.query(
        `
        SELECT
            reviews.*,
            properties.property_name,
            rooms.room_name,
            users.full_name AS customer_name,
            reservations.check_in_date,
            reservations.check_out_date
        FROM reviews
        JOIN reservations
            ON reviews.reservation_id = reservations.id
        JOIN rooms
            ON reservations.room_id = rooms.id
        JOIN properties
            ON reviews.property_id = properties.id
        JOIN users
            ON reviews.customer_id = users.id
        WHERE properties.owner_id = ?
        ORDER BY reviews.created_at DESC
        `,
        [ownerId]
    );

    return reviews;
};
const updateReview = async (
    reviewId,
    body
) => {

    const fields = [];
    const values = [];

    if (body.rating !== undefined) {
        fields.push("rating = ?");
        values.push(body.rating);
    }

    if (body.comment !== undefined) {
        fields.push("comment = ?");
        values.push(body.comment);
    }

    if (fields.length === 0) {
        return;
    }

    values.push(reviewId);

    await db.query(
        `
        UPDATE reviews
        SET ${fields.join(", ")}
        WHERE id = ?
        `,
        values
    );

};
const updateOwnerReply = async (reviewId, ownerReply, repliedBy) => {
    await db.query(
        `
        UPDATE reviews
        SET owner_reply = ?, replied_by = ?, replied_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [ownerReply, repliedBy, reviewId]
    );
};
const deleteReview = async (reviewId) => {

    await db.query(
        `
        DELETE FROM reviews
        WHERE id = ?
        `,
        [reviewId]
    );

};
const getAllReviews = async () => {

    const [reviews] = await db.query(
        `
        SELECT
            reviews.*,
            users.full_name
        FROM reviews
        JOIN users
            ON reviews.customer_id = users.id
        ORDER BY reviews.created_at DESC
        `
    );

    return reviews;

};
const getReservationById = async (reservationId) => {
    const [reservations] = await db.query(
        `
        SELECT *
        FROM reservations
        WHERE id = ?
        `,
        [reservationId]
    );

    return reservations[0];
};

const getReviewByReservationId = async (
    reservationId
) => {

    const [reviews] = await db.query(
        `
        SELECT *
        FROM reviews
        WHERE reservation_id = ?
        `,
        [reservationId]
    );

    return reviews[0];

};

module.exports = {
    getRoomById,
    getReservationById,
    getReviewByReservationId,
    insertReview,
    getReviewById,
    getPropertyReviews,
    getMyReviews,
    getOwnerReviews,
    updateReview,
    updateOwnerReply,
    deleteReview,
    getAllReviews
};
