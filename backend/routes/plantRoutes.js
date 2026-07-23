const express = require("express");

const {
    getAllPlants,
    getPlantById,
    createPlant,
    updatePlant,
    deletePlant,
    waterPlant
} = require("../controllers/plantController");

const router = express.Router();

router.get("/", getAllPlants);
router.get("/:id", getPlantById);
router.post("/", createPlant);
router.patch("/:id", updatePlant);
router.delete("/:id", deletePlant);
router.post("/:id/water", waterPlant);

module.exports = router;