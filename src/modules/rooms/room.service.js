const fs = require("fs");
const path = require("path");

const room = require("./room.model");
const property = require("../properties/property.model");
const { createRoomSchema, updateRoomSchema } = require("./room.validation");

const getPropertyRooms = async (propertyId) => {
  const propertyRow = await room.getApprovedPropertyById(propertyId);

  if (!propertyRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  const rooms = await room.getRoomsByPropertyId(propertyId);

  return {
    status: 200,
    result: true,
    message: "Rooms fetched successfully",
    data: rooms,
  };
};

const getRoomDetail = async (roomId) => {
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow) {
    return {
      status: 404,
      result: false,
      message: "Room not found",
    };
  }

  return {
    status: 200,
    result: true,
    message: "Room detail fetched successfully",
    data: roomRow,
  };
};

const createRoom = async (propertyId, ownerId, body) => {
  const { error, value } = createRoomSchema.validate(body, {
    abortEarly: false,
  });

  if (error) {
    return {
      result: false,
      message: "Invalid fields",
      status: 400,
      error: error.details.map((err) => ({
        field: err.path[0],
        message: err.message,
      })),
    };
  }

  const propertyRow = await property.findPropertyById(propertyId);

  if (!propertyRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  if (propertyRow.owner_id !== ownerId) {
    return {
      status: 403,
      result: false,
      message: "Forbidden",
    };
  }

  const data = [
    propertyId,
    value.room_type_id,
    value.room_name,
    value.description,
    value.price_per_night,
    value.max_guests,
    value.total_rooms,
    value.floor_number,
  ];

  const result = await room.createRoom(data);
  const row = await room.getRoomById(result.insertId);

  return {
    status: 201,
    result: true,
    message: "Room created successfully",
    data: {
      id: row.id,
      property_id: row.property_id,
      room_type_id: row.room_type_id,
      room_name: row.room_name,
      floor_number: row.floor_number,
      price_per_night: row.price_per_night,
      max_guests: row.max_guests,
      total_rooms: row.total_rooms,
    },
  };
};

const updateRoom = async (roomId, ownerId, body) => {
  const { error, value } = updateRoomSchema.validate(body, {
    abortEarly: false,
  });

  if (error) {
    return {
      result: false,
      message: "Invalid fields",
      status: 400,
      error: error.details.map((err) => ({
        field: err.path[0],
        message: err.message,
      })),
    };
  }

  const roomRow = await room.getRoomById(roomId);

  if (!roomRow) {
    return {
      status: 404,
      result: false,
      message: "Room not found",
    };
  }

  const propertyRow = await property.findPropertyById(roomRow.property_id);

  if (!propertyRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  // owner check
  if (propertyRow.owner_id !== ownerId) {
    return {
      status: 403,
      result: false,
      message: "Forbidden",
    };
  }

  await room.updateRoom(roomId, value);
  let row = await room.getRoomById(roomId);

  return {
    status: 200,
    result: true,
    message: "Room updated successfully",
    data: row,
  };
};

const deleteRoom = async (roomId, ownerId) => {
  // 1. check room
  const row = await room.getRoomById(roomId);

  if (!row) {
    return {
      status: 404,
      result: false,
      message: "Room not found",
    };
  }

  // 2. check ownership via property
  const propertyRow = await property.findPropertyById(row.property_id);

  if (!propertyRow || propertyRow.owner_id !== ownerId) {
    return {
      status: 403,
      result: false,
      message: "You do not own this room",
    };
  }

  // 3. soft delete
  await room.deleteRoom(roomId);

  return {
    status: 200,
    result: true,
    message: "Room deleted successfully",
    data: null,
  };
};

const getMyRooms = async (propertyId, ownerId, query) => {
  const propertyRow = await property.findPropertyById(propertyId);

  if (!propertyRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  if (propertyRow.owner_id !== ownerId) {
    return {
      status: 403,
      result: false,
      message: "Forbidden",
    };
  }

  const filters = {
    room_type_id: query.room_type_id || null,
    min_price: query.min_price || null,
    max_price: query.max_price || null,
    max_guests: query.max_guests || null,
    search: query.search || null,
    page: query.page || 1,
    limit: query.limit || 10,
  };

  const rooms = await room.getRoomsByPropertyId(propertyId, filters);

  return {
    status: 200,
    result: true,
    message: "My rooms fetched successfully",
    data: rooms,
  };
};

const uploadRoomImages = async (roomId, ownerId, files) => {
  // check files
  if (!files || files.length === 0) {
    return {
      status: 400,
      result: false,
      message: "No images uploaded",
    };
  }

  // check room
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow) {
    return {
      status: 404,
      result: false,
      message: "Room not found",
    };
  }

  // check property ownership
  const propertyRow = await property.findPropertyById(roomRow.property_id);

  if (!propertyRow || Number(propertyRow.owner_id) !== Number(ownerId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this room",
    };
  }

  // prepare images
  const images = files.map((file, index) => ({
    room_id: roomId,
    image_url: `/uploads/rooms/${file.filename}`,
    sort_order: index + 1,
  }));

  // save images
  await room.createManyRoomImages(images);

  return {
    status: 201,
    result: true,
    message: "Room images uploaded successfully",
    data: images,
  };
};

const deleteRoomImage = async (roomId, imageId, ownerId) => {
  // check room
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow) {
    return {
      status: 404,
      result: false,
      message: "Room not found",
    };
  }

  // check ownership
  const propertyRow = await property.findPropertyById(roomRow.property_id);

  if (!propertyRow || Number(propertyRow.owner_id) !== Number(ownerId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this room",
    };
  }

  // check image
  const imageRow = await room.findRoomImageById(imageId);

  if (!imageRow) {
    return {
      status: 404,
      result: false,
      message: "Image not found",
    };
  }

  // validate image belongs to room
  if (Number(imageRow.room_id) !== Number(roomId)) {
    return {
      status: 400,
      result: false,
      message: "Image does not belong to this room",
    };
  }

  // delete file
  const filePath = path.join(__dirname, "../../..", imageRow.image_url);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // delete db record
  await room.deleteRoomImage(imageId);

  return {
    status: 200,
    result: true,
    message: "Room image deleted successfully",
    data: null,
  };
};

const getRoomTypes = async () => {
  const types = await room.getRoomTypes();

  return types;
};

const getRoomImages = async (roomId) => {
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow || roomRow.deleted_at) {
    return {
      result: false,
      status: 404,
      message: "Room not found",
    };
  }

  const images = await room.getRoomImages(roomId);

  return {
    result: true,
    status: 200,
    message: "Room images fetched successfully",
    data: images,
  };
};

const setRoomCoverImage = async (roomId, imageId, ownerId) => {
  // check room
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow || roomRow.deleted_at) {
    return {
      result: false,
      status: 404,
      message: "Room not found",
    };
  }

  // check property ownership
  const propertyRow = await property.findPropertyById(roomRow.property_id);

  if (!propertyRow || propertyRow.owner_id !== ownerId) {
    return {
      result: false,
      status: 403,
      message: "You do not own this room",
    };
  }

  // check image
  const imageRow = await room.getRoomImageById(imageId);

  if (!imageRow || imageRow.room_id != roomId) {
    return {
      result: false,
      status: 404,
      message: "Image not found",
    };
  }

  // clear old cover
  await room.clearRoomCoverImages(roomId);

  // set new cover
  await room.setRoomCoverImage(imageId);

  return {
    result: true,
    status: 200,
    message: "Room cover image updated successfully",
    data: null,
  };
};

const sortRoomImages = async (roomId, body, ownerId) => {
  // check room
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow || roomRow.deleted_at) {
    return {
      result: false,
      status: 404,
      message: "Room not found",
    };
  }

  // check ownership
  const propertyRow = await property.findPropertyById(roomRow.property_id);

  if (!propertyRow || propertyRow.owner_id !== ownerId) {
    return {
      result: false,
      status: 403,
      message: "You do not own this room",
    };
  }

  // validate body
  if (!Array.isArray(body)) {
    return {
      result: false,
      status: 400,
      message: "Body must be array",
    };
  }

  // validate all images exist and belong to room
  const imageChecks = await Promise.all(
    body.map((item) => room.getRoomImageById(item.image_id))
  );

  for (let i = 0; i < body.length; i++) {
    const imageRow = imageChecks[i];
    const item = body[i];
    if (!imageRow || imageRow.room_id != roomId) {
      return {
        result: false,
        status: 404,
        message: `Image ${item.image_id} not found`,
      };
    }
  }

  // update sort order concurrently
  await Promise.all(
    body.map((item) => room.updateRoomImageSortOrder(item.image_id, item.sort_order))
  );

  return {
    result: true,
    status: 200,
    message: "Room image sort updated successfully",
    data: null,
  };
};

const checkRoomAvailability = async (roomId, query) => {
  const { check_in_date, check_out_date, guests } = query;

  // validate room
  const roomRow = await room.getRoomById(roomId);

  if (!roomRow || roomRow.deleted_at) {
    return {
      result: false,
      status: 404,
      message: "Room not found",
    };
  }

  // validate dates
  if (!check_in_date) {
    return {
      result: false,
      status: 400,
      message: "Check in date is required",
    };
  }

  if (!check_out_date) {
    return {
      result: false,
      status: 400,
      message: "Check out date is required",
    };
  }

  // validate guests
  const guestCount = parseInt(guests);

  if (!guestCount || guestCount <= 0) {
    return {
      result: false,
      status: 400,
      message: "Guests must be positive integer",
    };
  }

  // guest capacity
  if (guestCount > roomRow.max_guests) {
    return {
      result: false,
      status: 400,
      message: `Maximum guests allowed is ${roomRow.max_guests}`,
    };
  }

  // validate dates
  const today = new Date();
  const checkIn = new Date(check_in_date);
  const checkOut = new Date(check_out_date);

  today.setHours(0, 0, 0, 0);

  if (checkIn < today) {
    return {
      result: false,
      status: 400,
      message: "Check in date cannot be in the past",
    };
  }

  if (checkIn >= checkOut) {
    return {
      result: false,
      status: 400,
      message: "Check in date must be before check out date",
    };
  }

  // booked rooms
  const booked = await room.getBookedRoomCount(roomId, check_in_date, check_out_date);

  const availableQuantity = roomRow.total_rooms - booked.booked_count;

  return {
    result: true,
    status: 200,
    message: "Room availability checked successfully",
    data: {
      room_id: roomRow.id,
      room_name: roomRow.room_name,
      floor_number: roomRow.floor_number,
      total_rooms: roomRow.total_rooms,
      booked_rooms: booked.booked_count,
      available_rooms: availableQuantity,
      is_available: availableQuantity > 0,
      check_in_date,
      check_out_date,
      guests: guestCount,
    },
  };
};

const checkPropertyAvailability = async (propertyId, query) => {
  const { check_in_date, check_out_date, guests } = query;

  // property check
  const propertyRow = await property.findPropertyById(propertyId);

  if (!propertyRow) {
    return {
      result: false,
      status: 404,
      message: "Property not found",
    };
  }

  // validate guests
  const guestCount = parseInt(guests);

  if (!guestCount || guestCount <= 0) {
    return {
      result: false,
      status: 400,
      message: "Guests must be positive integer",
    };
  }

  // get rooms
  const rooms = await room.getAvailableRoomsByProperty(propertyId, guestCount);

  const availableRooms = [];

  for (const item of rooms) {
    const booked = await room.getBookedRoomCount(item.id, check_in_date, check_out_date);

    const availableQuantity = item.total_rooms - booked.booked_count;

    if (availableQuantity > 0) {
      availableRooms.push({
        room_id: item.id,
        room_name: item.room_name,
        floor_number: item.floor_number,
        room_type: item.type_name,
        price_per_night: item.price_per_night,
        max_guests: item.max_guests,
        available_rooms: availableQuantity,
        cover_image: item.cover_image,
      });
    }
  }

  return {
    result: true,
    status: 200,
    message: "Property availability checked successfully",
    data: {
      property_id: propertyRow.id,
      property_name: propertyRow.property_name,
      number_of_floors: propertyRow.number_of_floors,
      available_rooms: availableRooms,
    },
  };
};

const getRoomDetailByProperty = async (propertyId, roomId) => {
  const roomRow = await room.getRoomDetailByProperty(propertyId, roomId);

  if (!roomRow) {
    return {
      result: false,
      message: "Room not found",
      status: 404,
    };
  }

  room.images = await room.getRoomImages(roomId);

  return {
    result: true,
    message: "Room detail fetched successfully",
    status: 200,
    data: roomRow,
  };
};
module.exports = {
  getPropertyRooms,
  getRoomDetail,
  createRoom,
  updateRoom,
  deleteRoom,
  uploadRoomImages,
  deleteRoomImage,
  getMyRooms,
  getRoomTypes,
  getRoomImages,
  setRoomCoverImage,
  sortRoomImages,
  checkRoomAvailability,
  checkPropertyAvailability,
  getRoomDetailByProperty,
};
