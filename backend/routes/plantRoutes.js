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

router.use(authenticateToken);

router.get(
  "/",
  getAllPlants,
);

router.get(
  "/:id",
  getPlantById,
);

router.post(
  "/",
  createPlant,
);

router.patch(
  "/:id/water",
  waterPlant,
);

/*
 * Keeps older POST watering calls working.
 */
router.post(
  "/:id/water",
  waterPlant,
);

router.patch(
  "/:id",
  updatePlant,
);

router.delete(
  "/:id",
  deletePlant,
);

module.exports = router;
