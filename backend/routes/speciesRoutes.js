const express = require("express");

const {
    getAllSpecies,
    getSpeciesById,
    createSpecies,
    updateSpecies,
    deleteSpecies
} = require("../controllers/speciesController");

const router = express.Router();

router.get("/", getAllSpecies);
router.get("/:id", getSpeciesById);
router.post("/", createSpecies);
router.patch("/:id", updateSpecies);
router.delete("/:id", deleteSpecies);

module.exports = router;