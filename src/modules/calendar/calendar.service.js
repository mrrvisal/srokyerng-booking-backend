const dayjs = require("dayjs");
const calendarModel = require("./calendar.model");
const calendarValidation = require("./calendar.validation");
const { getRoomById, getRoomsByPropertyId } = require("../rooms/room.model");

const { getDatesBetween } = require("../../utils/getDatesBetween");

const getRoomCalendar = async (roomId, startDate, endDate) => {
  if (dayjs(startDate).isBefore(dayjs().startOf("day"))) {
    return {
      result: false,
      status: 400,
      message: "Start date cannot be in the past",
    };
  }
  const room = await getRoomById(roomId);

  if (!room) {
    return {
      result: false,
      status: 404,
      message: "Room not found",
    };
  }

  const reservations = await calendarModel.getRoomReservations(
    roomId,
    startDate,
    endDate
  );

  const blocks = await calendarModel.getRoomBlocks(roomId, startDate, endDate);
  const blockedDates = [...new Set(blocks.map((b) => dayjs(b.start_date).format("YYYY-MM-DD")))];

  const totalRooms = room.total_rooms || 1;

  // Count how many reservations occupy each date, since a room type can
  // have multiple bookable units (total_rooms). A date is only fully
  // unavailable once bookings for it reach that count.
  const bookedCountByDate = {};

  reservations.forEach((reservation) => {
    getDatesBetween(
      reservation.check_in_date,
      reservation.check_out_date
    ).forEach((date) => {
      bookedCountByDate[date] = (bookedCountByDate[date] || 0) + 1;
    });
  });

  const allDates = getDatesBetween(startDate, endDate);

  const unavailableDates = allDates.filter(
    (date) => (bookedCountByDate[date] || 0) >= totalRooms || blockedDates.includes(date)
  );

  const availableDates = allDates.filter(
    (date) => (bookedCountByDate[date] || 0) < totalRooms && !blockedDates.includes(date)
  );

  return {
    result: true,
    status: 200,
    data: {
      room_id: roomId,
      available_dates: availableDates,
      unavailable_dates: unavailableDates,
      blocked_dates: blockedDates,
    },
  };
};

const getPropertyCalendar = async (propertyId, startDate, endDate) => {
  const property = await calendarModel.getPropertyById(propertyId);

  if (!property) {
    return {
      result: false,
      status: 404,
      message: "Property not found",
    };
  }

  // Need every room in the property (not just ones with existing
  // reservations) so a room with zero bookings still counts as available
  // capacity when deciding whether the property as a whole is booked out.
  const rooms = await getRoomsByPropertyId(propertyId);
  const reservations = await calendarModel.getPropertyReservations(
    propertyId,
    startDate,
    endDate
  );
  const blocks = await calendarModel.getPropertyBlocks(propertyId, startDate, endDate);

  const blockedDates = [...new Set(blocks.map((b) => dayjs(b.start_date).format("YYYY-MM-DD")))];
  const allDates = getDatesBetween(startDate, endDate);

  // Bucket reservations and blocks per room_id, so each room's own
  // total_rooms (inventory) gates its own availability instead of one
  // booking anywhere in the property marking every room's dates as taken.
  const bookedCountByRoomDate = {};
  reservations.forEach((reservation) => {
    const key = reservation.room_id;
    bookedCountByRoomDate[key] = bookedCountByRoomDate[key] || {};
    getDatesBetween(reservation.check_in_date, reservation.check_out_date).forEach((date) => {
      bookedCountByRoomDate[key][date] = (bookedCountByRoomDate[key][date] || 0) + 1;
    });
  });

  const blockedDatesByRoom = {};
  blocks.forEach((block) => {
    const key = block.room_id;
    blockedDatesByRoom[key] = blockedDatesByRoom[key] || new Set();
    blockedDatesByRoom[key].add(dayjs(block.start_date).format("YYYY-MM-DD"));
  });

  // A date is available at the property level if AT LEAST ONE room still
  // has free inventory that day; it's only unavailable once every room
  // (across every room type) is fully booked or blocked for that date.
  const availableDates = [];
  const unavailableDates = [];

  allDates.forEach((date) => {
    const anyRoomAvailable = rooms.some((room) => {
      const totalRooms = room.total_rooms || 1;
      const bookedCount = bookedCountByRoomDate[room.id]?.[date] || 0;
      const isBlocked = blockedDatesByRoom[room.id]?.has(date) || false;
      return bookedCount < totalRooms && !isBlocked;
    });

    if (anyRoomAvailable || rooms.length === 0) {
      availableDates.push(date);
    } else {
      unavailableDates.push(date);
    }
  });

  return {
    result: true,
    status: 200,
    data: {
      // Inventory-aware fields — a date is only unavailable once every room
      // in the property is fully booked/blocked (see loop above).
      available_dates: availableDates,
      unavailable_dates: unavailableDates,
      blocked_dates: blockedDates,
      // Kept for the owner-mode "click a day to see which guest booked it"
      // panel, which needs the raw per-reservation rows, not just counts.
      reservations,
    },
  };
};

const getOwnerPropertyCalendar = async (propertyId, ownerId, startDate, endDate) => {
  const property = await calendarModel.getOwnerProperty(propertyId, ownerId);

  if (!property) {
    return {
      result: false,
      status: 403,
      message: "Property not found",
    };
  }

  return getPropertyCalendar(propertyId, startDate, endDate);
};

const getOwnerRoomCalendar = async (roomId, ownerId, startDate, endDate) => {
  const room = await calendarModel.getOwnerRoom(roomId, ownerId);

  if (!room) {
    return {
      result: false,
      status: 403,
      message: "Room not found",
    };
  }

  return getRoomCalendar(roomId, startDate, endDate);
};

const createRoomBlock = async (roomId, ownerId, date, reason) => {
  const room = await calendarModel.getOwnerRoom(roomId, ownerId);
  if (!room) {
    return { result: false, status: 403, message: "Room not found" };
  }

  const existing = await calendarModel.getRoomBlockByDate(roomId, date);
  if (existing) {
    // Already blocked — idempotent, just hand back the existing block.
    return { result: true, status: 200, data: existing };
  }

  const insertId = await calendarModel.insertRoomBlock(roomId, ownerId, date, reason);
  return {
    result: true,
    status: 201,
    data: { id: insertId, room_id: Number(roomId), start_date: date, end_date: date, reason: reason || null },
  };
};

const removeRoomBlock = async (roomId, ownerId, date) => {
  const room = await calendarModel.getOwnerRoom(roomId, ownerId);
  if (!room) {
    return { result: false, status: 403, message: "Room not found" };
  }

  const existing = await calendarModel.getRoomBlockByDate(roomId, date);
  if (!existing) {
    return { result: false, status: 404, message: "Block not found" };
  }

  await calendarModel.deleteRoomBlockById(existing.id);
  return { result: true, status: 200, message: "Block removed" };
};

module.exports = {
  getRoomCalendar,
  getPropertyCalendar,
  getOwnerPropertyCalendar,
  getOwnerRoomCalendar,
  createRoomBlock,
  removeRoomBlock,
};
