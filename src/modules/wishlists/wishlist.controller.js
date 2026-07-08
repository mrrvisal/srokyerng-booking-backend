const asyncHandler = require("../../utils/asyncHandler");

const wishlistService = require("./wishlist.service");

const addWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.addWishlist(req.user.id, req.params.propertyId);

  return res.status(result.status).json(result);
});

const removeWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.removeWishlist(req.user.id, req.params.propertyId);

  return res.status(result.status).json(result);
});

const getMyWishlist = asyncHandler(async (req, res) => {
  const result = await wishlistService.getMyWishlist(req.user.id);

  return res.status(result.status).json(result);
});

const checkWishlistStatus = asyncHandler(async (req, res) => {
  const result = await wishlistService.checkWishlistStatus(
    req.user.id,
    req.params.propertyId
  );

  return res.status(result.status).json(result);
});

module.exports = {
  addWishlist,
  removeWishlist,
  getMyWishlist,
  checkWishlistStatus,
};
