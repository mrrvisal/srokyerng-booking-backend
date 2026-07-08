const fs = require("fs");
const path = require("path");
const property = require("./property.model");
const roomModel = require("../rooms/room.model");

const notificationService = require("../notifications/notification.service");
const { getIO } = require("../../services/socket.registry");

const {
  createPropertySchema,
  updatePropertySchema,
  rejectUpdateRequestSchema,
  isValidRow,
} = require("./property.validation");

const getAllCategories = async () => {
  const rows = await property.getAllCategories();
  return rows;
};

const getAllApproved = async (query) => {
  const filters = {
    city_id: query.city_id || null,
    province_id: query.province_id || null,
    category_id: query.category_id || null,
    search: query.search || null,
    page: query.page || 1,
    limit: query.limit || 10,
  };

  const rows = await property.getAllApproved(filters);

  const result = rows.map((item) => ({
    id: item.id,
    property_name: item.property_name,
    description: item.description,
    number_of_floors: item.number_of_floors,

    city: {
      city_id: item.city_id,
      city_name: item.city_name,
    },

    province: {
      province_id: item.province_id,
      province_name: item.province_name,
    },

    country: {
      country_id: item.country_id,
      country_name: item.country_name,
    },

    category: {
      category_id: item.category_id,
      category_name: item.category_name,
    },

    image_url: item.image_url,
    price_per_night: item.price_per_night,
    average_rating: item.average_rating,
  }));

  return result;
};

const getAll = async (query) => {
  const filters = {
    city_id: query.city_id || null,
    province_id: query.province_id || null,
    country_id: query.country_id || null,
    category_id: query.category_id || null,
    status_id: query.status_id || null,
    search: query.search || null,
    page: query.page || 1,
    limit: query.limit || 10,
  };

  const rows = await property.getAll(filters);

  return rows.map((p) => ({
    id: p.id,
    property_name: p.property_name,
    description: p.description,
    address: p.address,
    number_of_floors: p.number_of_floors,

    owner: {
      owner_id: p.owner_id,
      owner_name: p.owner_name,
      owner_email: p.owner_email,
      owner_phone: p.owner_phone,
    },

    category: {
      category_id: p.category_id,
      category_name: p.category_name,
    },

    status: {
      status_id: p.status_id,
      status_name: p.status_name,
    },

    city: p.city_id
      ? {
          city_id: p.city_id,
          city_name: p.city_name,
        }
      : null,

    province: p.province_id
      ? {
          province_id: p.province_id,
          province_name: p.province_name,
        }
      : null,

    country: p.country_id
      ? {
          country_id: p.country_id,
          country_name: p.country_name,
        }
      : null,

    image_url: p.image_url || null,
    price_per_night: p.price_per_night,
    average_rating: p.average_rating,
    room_count: p.room_count,

    rejection_reason: p.rejection_reason,
    approved_by: p.approved_by,
    approved_at: p.approved_at,

    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
};

const register = async (user_id, body) => {
  // =========================
  // VALIDATION
  // =========================
  const { error, value } = createPropertySchema.validate(body, {
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

  // =========================
  // CREATE PROPERTY
  // =========================
  const result = await property.create(user_id, value);

  if (!result || !result.insertId) {
    return {
      result: false,
      message: "Failed to create property",
      status: 500,
    };
  }

  // =========================
  // FETCH CREATED PROPERTY
  // =========================
  const [rows] = await property.getById(result.insertId);

  try {
    getIO()
      ?.to("admins")
      .emit("admin:activity", {
        type: "property_submitted",
        data: { property_id: result.insertId, owner_id: user_id },
      });
  } catch (error) {
    console.error("Admin activity emit failed:", error);
  }

  return {
    result: true,
    message: "Property created successfully",
    status: 201,
    data: rows,
  };
};

const getDetail = async (id) => {
  if (isNaN(id)) {
    throw new Error("Id must be number");
  }
  let row = await property.getDetail(id);
  if (isValidRow) {
    let property_data = row[0];
    const images = await property.getImages(property_data.id);
    const amenities = await property.getAmenities(property_data.id);
    const rooms = await property.getRooms(property_data.id);
    property_data.images = images;
    property_data.amenities = amenities;
    property_data.rooms = rooms;
    return {
      result: true,
      message: "Get owner detail successfully",
      status: 200,
      data: property_data,
    };
  } else if (!isValidRow) {
    return {
      result: false,
      message: "Owner detail not found",
      status: 404,
    };
  }
};

const getMyProperty = async (owner_id, query) => {
  const filters = {
    city_id: query.city_id || null,
    province_id: query.province_id || null,
    category_id: query.category_id || null,
    search: query.search || null,
    page: query.page || 1,
    limit: query.limit || 10,
  };

  const rows = await property.getMyProperty(owner_id, filters);

  if (!rows) {
    return {
      result: false,
      message: "Cannot fetch my properties",
      status: 500,
    };
  }

  return {
    result: true,
    message: "My properties fetched successfully",
    status: 200,
    data: rows,
  };
};

const updateStatus = async (admin_id, property_id, body) => {
  // =====================================
  // VALID STATUS
  // =====================================
  const validStatus = [1, 2, 3, 4];

  if (!validStatus.includes(Number(body.status_id))) {
    return {
      result: false,
      message: "Invalid status id",
      status: 400,
    };
  }

  // =====================================
  // REJECT VALIDATION
  // =====================================
  if (
    Number(body.status_id) === 3 &&
    (!body.rejection_reason || body.rejection_reason.trim() === "")
  ) {
    return {
      result: false,
      message: "Please enter rejection reason",
      status: 400,
    };
  }

  // =====================================
  // APPROVED
  // =====================================
  if (Number(body.status_id) === 2) {
    // Validate property has at least one image
    const images = await property.getImages(property_id);
    if (!images || images.length === 0) {
      return {
        result: false,
        message: "Property must have at least one image to be approved",
        status: 400,
      };
    }

    // Validate property has at least one room
    const rooms = await property.getRooms(property_id);
    if (!rooms || rooms.length === 0) {
      return {
        result: false,
        message: "Property must have at least one room to be approved",
        status: 400,
      };
    }

    // Validate each room has at least one image
    for (const r of rooms) {
      const roomImages = await roomModel.getRoomImages(r.id);
      if (!roomImages || roomImages.length === 0) {
        return {
          result: false,
          message: `Room '${r.room_name}' must have at least one image to approve property`,
          status: 400,
        };
      }
    }

    body.rejection_reason = null;
    body.approved_at = new Date();

    await property.updateStatus(admin_id, property_id, body);
    const getProperty = await property.findPropertyById(property_id);

    await notificationService.notifyUserSafely({
      userId: getProperty.owner_id,
      type: notificationService.NOTIFICATION_TYPES.PROPERTY_APPROVED,
      title: "Request approved",
      message: "Your request has been approved.",
      data: {
        property_id,
      },
      critical: true,
    });
  }

  // =====================================
  // REJECTED
  // =====================================
  else if (Number(body.status_id) === 3) {
    body.approved_at = new Date();

    await property.updateStatus(admin_id, property_id, body);
    const getProperty = await property.findPropertyById(property_id);
    await notificationService.notifyUserSafely({
      userId: getProperty.owner_id,
      type: notificationService.NOTIFICATION_TYPES.PROPERTY_REJECTED,
      title: "Request rejected",
      message: `Your request has been rejected: ${body.rejection_reason}`,
      data: {
        property_id,
        rejection_reason: body.rejection_reason,
      },
      critical: true,
    });
  }

  // =====================================
  // PENDING / SUSPENDED
  // =====================================
  else if (Number(body.status_id) === 1 || Number(body.status_id) === 4) {
    body.rejection_reason = null;
    body.approved_at = null;

    await property.updateStatus(null, property_id, body);
  }

  // =====================================
  // GET UPDATED DATA
  // =====================================
  let row = await property.getUpdatePropertyById(property_id);

  return {
    result: true,
    message: "Updated status successfully",
    status: 200,
    data: row[0],
  };
};

const getMyPropertyById = async (property_id, owner_id) => {
  const rows = await property.getMyOwnPropertyById(property_id, owner_id);

  if (!rows.length) {
    return {
      result: false,
      message: "My property not found",
      status: 404,
    };
  }

  const p = rows[0];

  const data = {
    id: p.id,
    property_name: p.property_name,
    slug: p.slug,
    description: p.description,
    address: p.address,

    city: {
      city_id: p.city_id,
      city_name: p.city_name,
    },

    province: {
      province_id: p.province_id,
      province_name: p.province_name,
    },

    country: {
      country_id: p.country_id,
      country_name: p.country_name,
    },

    latitude: p.latitude,
    longitude: p.longitude,

    contact_phone: p.contact_phone,
    contact_email: p.contact_email,

    number_of_floors: p.number_of_floors,

    created_at: p.created_at,
    updated_at: p.updated_at,

    category: {
      category_id: p.category_id,
      category_name: p.category_name,
    },

    status: {
      status_id: p.status_id,
      status_name: p.status_name,
    },

    rejection_reason: p.rejection_reason,

    owner: {
      owner_id: p.owner_id,
      full_name: p.full_name,
      phone: p.owner_phone,
      email: p.owner_email,
    },

    images: rows
      .filter((row) => row.image_id)
      .map((row) => ({
        image_id: row.image_id,
        image_url: row.image_url,
        is_cover: Boolean(row.is_cover),
        sort_order: row.sort_order,
      })),
  };

  return {
    result: true,
    message: "get my property successfully",
    status: 200,
    data,
  };
};

const update = async (property_id, owner_id, body) => {
  // joi validation
  const validate = updatePropertySchema.validate(body, {
    abortEarly: false,
  });

  // validation error
  if (validate.error) {
    return {
      result: false,
      message: "Invalid fields",
      error: validate.error.details.map((err) => ({
        field: err.path[0],
        message: err.message,
      })),
      status: 400,
    };
  }

  // validated data
  const value = validate.value;

  // check property ownership
  let checkRow = await property.checkOwnerProperty(property_id, owner_id);

  if (checkRow.length === 0) {
    return {
      result: false,
      message: "Property not found",
      status: 404,
    };
  }

  // allow update only when pending
  // if (checkRow[0].status_id != 1) {
  //   return {
  //     result: false,
  //     message: "Cannot update because status is not pending",
  //     status: 403,
  //   };
  // }

  // update property
  // await property.update(property_id, owner_id, value);

  // get updated property
  // let row = await property.getById(property_id);

  //
  if (checkRow[0].status_id == 1 || checkRow[0].status_id == 3) {
    await property.update(property_id, owner_id, value);

    const row = await property.getById(property_id);

    return {
      result: true,
      message: "Property updated successfully",
      status: 200,
      data: row[0],
    };
  }

  if (checkRow[0].status_id == 2) {
    await property.createUpdateRequest(property_id, owner_id, JSON.stringify(value));

    return {
      result: true,
      message: "Update request submitted for admin review",
      status: 200,
    };
  }
  return {
    result: false,
    message: "Property cannot be updated",
    status: 403,
  };
};

const deleteProperty = async (propertyId, userId) => {
  // check property
  const checkRow = await property.findPropertyById(propertyId);

  if (!checkRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  // check owner
  if (Number(checkRow.owner_id) !== Number(userId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this property",
    };
  }

  // soft delete
  await property.softDeleteProperty(propertyId);

  return {
    status: 200,
    result: true,
    message: "Property deleted successfully",
  };
};

const getPropertyImages = async (propertyId) => {
  // check property
  const propertyRow = await property.findPropertyById(propertyId);

  if (!propertyRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  // get images
  const images = await property.getImages(propertyId);

  return {
    status: 200,
    result: true,
    message: "Property images fetched successfully",
    data: images,
  };
};

const uploadPropertyImages = async (propertyId, userId, files) => {
  // check files
  if (!files || files.length === 0) {
    return {
      status: 400,
      result: false,
      message: "Images are required",
    };
  }

  // check property
  const checkRow = await property.findPropertyById(propertyId);

  if (!checkRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  // check owner
  if (Number(checkRow.owner_id) !== Number(userId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this property",
    };
  }

  // prepare insert data
  const images = files.map((file, index) => ({
    property_id: propertyId,
    image_url: `/uploads/properties/${file.filename}`,
    sort_order: index,
  }));

  // insert images
  await property.createManyPropertyImages(images);

  return {
    status: 201,
    result: true,
    message: "Property images uploaded successfully",
    data: images,
  };
};

const deletePropertyImage = async (propertyId, imageId, userId) => {
  // check property
  const checkRow = await property.findPropertyById(propertyId);

  if (!checkRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  // check owner
  if (Number(checkRow.owner_id) !== Number(userId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this property",
    };
  }

  // check image
  const image = await property.findImageById(imageId);

  if (!image) {
    return {
      status: 404,
      result: false,
      message: "Image not found",
    };
  }

  // check image belongs to property
  if (Number(image.property_id) !== Number(propertyId)) {
    return {
      status: 400,
      result: false,
      message: "Image does not belong to this property",
    };
  }

  // delete physical file
  const filePath = path.join(__dirname, "../../..", image.image_url);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // delete db record
  await property.deleteImage(imageId);

  return {
    status: 200,
    result: true,
    message: "Property image deleted successfully",
  };
};

const setCoverImage = async (propertyId, imageId, ownerId) => {
  const checkRow = await property.findPropertyById(propertyId);

  if (!checkRow) {
    return {
      status: 404,
      result: false,
      message: "Property not found",
    };
  }

  if (Number(checkRow.owner_id) !== Number(ownerId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this property",
    };
  }

  const image = await property.findImageById(imageId);

  if (!image) {
    return {
      status: 404,
      result: false,
      message: "Image not found",
    };
  }

  if (Number(image.property_id) !== Number(propertyId)) {
    return {
      status: 400,
      result: false,
      message: "Image does not belong to this property",
    };
  }

  await property.resetCoverImages(propertyId);

  await property.setCoverImage(imageId);

  return {
    status: 200,
    result: true,
    message: "Cover image updated successfully",
    data: null,
  };
};

const sortPropertyImages = async (propertyId, images, ownerId) => {
  if (!Array.isArray(images)) {
    return {
      status: 400,
      result: false,
      message: "Images sort data must be an array",
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

  if (Number(propertyRow.owner_id) !== Number(ownerId)) {
    return {
      status: 403,
      result: false,
      message: "You do not own this property",
    };
  }

  await Promise.all(
    images.map((item) => property.updateImageSortOrder(item.image_id, item.sort_order))
  );

  return {
    status: 200,
    result: true,
    message: "Image sort updated successfully",
    data: null,
  };
};

const getPropertyDetailForAdmin = async (propertyId) => {
  const propertyRow = await property.getPropertyDetailForAdmin(propertyId);

  if (!propertyRow) {
    return {
      result: false,
      status: 404,
      message: "Property not found",
    };
  }

  const images = await property.getImages(propertyId);

  const amenities = await property.getAmenities(propertyId);

  const rooms = await property.getRooms(propertyId);

  propertyRow.images = images;
  propertyRow.amenities = amenities;
  propertyRow.rooms = rooms;

  return {
    result: true,
    status: 200,
    message: "Property detail fetched successfully",
    data: propertyRow,
  };
};
const approvePropertyUpdateRequest = async (requestId, adminId) => {
  const request = await property.getUpdateRequestById(requestId);

  if (!request) {
    return {
      result: false,
      message: "Request not found",
      status: 404,
    };
  }

  // const data = JSON.parse(request.update_data);
  const data = request.update_data;

  await property.update(request.property_id, request.owner_id, data);

  await property.approveUpdateRequest(requestId, adminId);

  return {
    result: true,
    message: "Request approved successfully",
    status: 200,
  };
};

const rejectPropertyUpdateRequest = async (requestId, adminId, reason) => {
  const { error } = rejectUpdateRequestSchema.validate({ reason });
  if (error) {
    return {
      result: false,
      message: error.details[0].message,
      status: 400,
    };
  }

  await property.rejectUpdateRequest(requestId, adminId, reason);

  return {
    result: true,
    message: "Request rejected successfully",
    status: 200,
  };
};

const getPropertyUpdateRequests = async () => {
  const rows = await property.getAllUpdateRequests();

  return {
    result: true,
    message: "Update requests fetched successfully",
    status: 200,
    data: rows,
  };
};

const getPropertyUpdateRequestDetail = async (requestId) => {
  const row = await property.getUpdateRequestById(requestId);

  if (!row) {
    return {
      result: false,
      message: "Request not found",
      status: 404,
    };
  }

  return {
    result: true,
    message: "Request detail fetched successfully",
    status: 200,
    data: row,
  };
};

const getCities = async () => {
  const rows = await property.CityModel.getAll();
  return {
    result: true,
    message: "Get all cities successfully",
    status: 200,
    data: rows,
  };
};

const getProvince = async () => {
  const rows = await property.getProvince();
  return {
    result: true,
    message: "Get all provinces successfully",
    status: 200,
    data: rows,
  };
};

module.exports = {
  getAllCategories,

  getAllApproved,
  getAll,
  getDetail,
  register,
  getMyProperty,
  updateStatus,
  getMyPropertyById,
  update,
  deleteProperty,
  getPropertyImages,
  uploadPropertyImages,
  deletePropertyImage,
  setCoverImage,
  sortPropertyImages,
  getPropertyDetailForAdmin,
  getPropertyUpdateRequests,
  getPropertyUpdateRequestDetail,
  approvePropertyUpdateRequest,
  rejectPropertyUpdateRequest,

  getCities,
  getProvince,
};
