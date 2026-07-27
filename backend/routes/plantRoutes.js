const express = require("express");
const authenticateToken = require("../middleware/authenticateToken");


const {
    getAllPlants,
    getPlantById,
    createPlant,
    updatePlant,
    deletePlant,
    waterPlant
} = require("../controllers/plantController");

const router = express.Router();

router.get("/", authenticateToken, getAllPlants);
router.get("/:id", authenticateToken, getPlantById);
router.post("/", authenticateToken, createPlant);
router.patch("/:id", authenticateToken, updatePlant);
router.delete("/:id", authenticateToken, deletePlant);
router.post("/:id/water", authenticateToken, waterPlant);

module.exports = router;