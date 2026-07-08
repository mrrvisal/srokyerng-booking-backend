const express = require("express");

const router = express.Router();

const amenityController = require(
    "./amenity.controller"
);

router.get(
    "/",
    amenityController.getAllAmenities
);

module.exports = router;