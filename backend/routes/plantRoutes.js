const express = require("express");

const authenticateToken = require(
  "../middleware/authenticateToken"
);

const {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  waterPlant,
} = require(
  "../controllers/plantController"
);

const router = express.Router();

/*
 * Verifies the Bearer token and
 * sets req.userId for every route.
 */
router.use(authenticateToken);

router.get(
  "/",
  getAllPlants
);

router.get(
  "/:id",
  getPlantById
);

router.post(
  "/",
  createPlant
);

/*
 * Supports the newer PATCH request
 * and the older POST request.
 */
router.patch(
  "/:id/water",
  waterPlant
);

router.post(
  "/:id/water",
  waterPlant
);

router.patch(
  "/:id",
  updatePlant
);

router.delete(
  "/:id",
  deletePlant
);

module.exports = router;
