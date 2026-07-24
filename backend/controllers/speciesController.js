const { ObjectId } = require("mongodb");
const { client } = require("../config/db");

function getSpeciesCollection() {
    return client.db().collection("plant_species");
}

// GET /api/species
async function getAllSpecies(req, res) {
    try {
        const speciesCollection = getSpeciesCollection();

        const species = await speciesCollection
            .find({})
            .sort({ commonName: 1 })
            .toArray();

        res.status(200).json(species);
    } catch (error) {
        console.error("Error retrieving plant species:", error);

        res.status(500).json({
            error: "Failed to retrieve plant species."
        });
    }
}

// GET /api/species/:id
async function getSpeciesById(req, res) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid species ID."
            });
        }

        const speciesCollection = getSpeciesCollection();

        const species = await speciesCollection.findOne({
            _id: new ObjectId(id)
        });

        if (!species) {
            return res.status(404).json({
                error: "Plant species not found."
            });
        }

        res.status(200).json(species);
    } catch (error) {
        console.error("Error retrieving plant species:", error);

        res.status(500).json({
            error: "Failed to retrieve plant species."
        });
    }
}

// POST /api/species
async function createSpecies(req, res) {
    try {
        const {
            commonName,
            scientificName,
            watering,
            light,
            description
        } = req.body;

        if (
            typeof commonName !== "string" ||
            commonName.trim() === ""
        ) {
            return res.status(400).json({
                error: "commonName is required."
            });
        }

        if (
            !watering ||
            typeof watering.intervalDays !== "number" ||
            watering.intervalDays < 1
        ) {
            return res.status(400).json({
                error: "watering.intervalDays must be a number greater than 0."
            });
        }

        const now = new Date();

        const newSpecies = {
            commonName: commonName.trim(),
            scientificName:
                typeof scientificName === "string"
                    ? scientificName.trim()
                    : "",
            watering: {
                intervalDays: watering.intervalDays
            },
            light:
                typeof light === "string"
                    ? light.trim()
                    : "",
            description:
                typeof description === "string"
                    ? description.trim()
                    : "",
            createdAt: now,
            updatedAt: now
        };

        const speciesCollection = getSpeciesCollection();

        const result = await speciesCollection.insertOne(newSpecies);

        const createdSpecies = await speciesCollection.findOne({
            _id: result.insertedId
        });

        res.status(201).json({
            message: "Plant species created successfully.",
            species: createdSpecies
        });
    } catch (error) {
        console.error("Error creating plant species:", error);

        res.status(500).json({
            error: "Failed to create plant species."
        });
    }
}

// PATCH /api/species/:id
async function updateSpecies(req, res) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid species ID."
            });
        }

        const allowedFields = [
            "commonName",
            "scientificName",
            "watering",
            "light",
            "description"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: "No valid fields were provided for update."
            });
        }

        if (
            updates.commonName !== undefined &&
            (
                typeof updates.commonName !== "string" ||
                updates.commonName.trim() === ""
            )
        ) {
            return res.status(400).json({
                error: "commonName must be a non-empty string."
            });
        }

        if (
            updates.watering !== undefined &&
            (
                typeof updates.watering !== "object" ||
                typeof updates.watering.intervalDays !== "number" ||
                updates.watering.intervalDays < 1
            )
        ) {
            return res.status(400).json({
                error: "watering.intervalDays must be a number greater than 0."
            });
        }

        if (typeof updates.commonName === "string") {
            updates.commonName = updates.commonName.trim();
        }

        if (typeof updates.scientificName === "string") {
            updates.scientificName = updates.scientificName.trim();
        }

        if (typeof updates.light === "string") {
            updates.light = updates.light.trim();
        }

        if (typeof updates.description === "string") {
            updates.description = updates.description.trim();
        }

        updates.updatedAt = new Date();

        const speciesCollection = getSpeciesCollection();

        const result = await speciesCollection.updateOne(
            {
                _id: new ObjectId(id)
            },
            {
                $set: updates
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: "Plant species not found."
            });
        }

        const updatedSpecies = await speciesCollection.findOne({
            _id: new ObjectId(id)
        });

        res.status(200).json({
            message: "Plant species updated successfully.",
            species: updatedSpecies
        });
    } catch (error) {
        console.error("Error updating plant species:", error);

        res.status(500).json({
            error: "Failed to update plant species."
        });
    }
}

// DELETE /api/species/:id
async function deleteSpecies(req, res) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid species ID."
            });
        }

        const speciesCollection = getSpeciesCollection();

        const result = await speciesCollection.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Plant species not found."
            });
        }

        res.status(200).json({
            message: "Plant species deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting plant species:", error);

        res.status(500).json({
            error: "Failed to delete plant species."
        });
    }
}

module.exports = {
    getAllSpecies,
    getSpeciesById,
    createSpecies,
    updateSpecies,
    deleteSpecies
};