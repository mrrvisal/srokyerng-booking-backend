const wishlist = require("./wishlist.model");

const addWishlist = async (customerId, propertyId) => {
  const property = await wishlist.getApprovedPropertyById(propertyId);

  if (!property) {
    return {
      result: false,
      status: 404,
      message: "Property not found",
    };
  }

  const existing = await wishlist.getWishlist(customerId, propertyId);

  if (existing) {
    return {
      result: false,
      status: 409,
      message: "Property already saved",
    };
  }

  await wishlist.createWishlist(customerId, propertyId);

  return {
    result: true,
    status: 201,
    message: "Property saved successfully",
  };
};

const removeWishlist = async (customerId, propertyId) => {
  const existing = await wishlist.getWishlist(customerId, propertyId);

  if (!existing) {
    return {
      result: false,
      status: 404,
      message: "Wishlist item not found",
    };
  }

  await wishlist.deleteWishlist(customerId, propertyId);

  return {
    result: true,
    status: 200,
    message: "Wishlist removed successfully",
  };
};

const getMyWishlist = async (customerId) => {
  const rows = await wishlist.getMyWishlists(customerId);

  return {
    result: true,
    status: 200,
    message: "Wishlist fetched successfully",
    data: rows,
  };
};

const checkWishlistStatus = async (customerId, propertyId) => {
  const row = await wishlist.getWishlist(customerId, propertyId);

  return {
    result: true,
    status: 200,
    message: "Wishlist status fetched",
    data: {
      is_saved: !!row,
    },
  };
};

module.exports = {
  addWishlist,
  removeWishlist,
  getMyWishlist,
  checkWishlistStatus,
};
