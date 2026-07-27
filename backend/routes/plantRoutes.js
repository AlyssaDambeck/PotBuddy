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
} = require("../controllers/plantController");

const router = express.Router();

/*
 * Verifies the Bearer token and sets req.userId
 * for every plant endpoint below.
 */
router.use(authenticateToken);

router.get("/", getAllPlants);
router.get("/:id", getPlantById);
router.post("/", createPlant);

router.patch("/:id/water", waterPlant);

/*
 * Keep POST watering temporarily for compatibility
 * with any older frontend code.
 */
router.post("/:id/water", waterPlant);

router.patch("/:id", updatePlant);
router.delete("/:id", deletePlant);

module.exports = router;
