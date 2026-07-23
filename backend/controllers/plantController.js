const { ObjectId } = require("mongodb");
const { client } = require("../config/db");

function getPlantsCollection() {
    return client.db().collection("user_plants");
}

// GET /api/plants
async function getAllPlants(req, res) {
    try {
        const plantsCollection = getPlantsCollection();

        const plants = await plantsCollection.find({}).toArray();

        res.status(200).json({
            plants,
            count: plants.length
        });
    } catch (error) {
        console.error("Error getting plants:", error);

        res.status(500).json({
            error: "Failed to retrieve plants."
        });
    }
}

// GET /api/plants/:id
async function getPlantById(req, res) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid plant ID."
            });
        }

        const plantsCollection = getPlantsCollection();

        const plant = await plantsCollection.findOne({
            _id: new ObjectId(id)
        });

        if (!plant) {
            return res.status(404).json({
                error: "Plant not found."
            });
        }

        res.status(200).json({
            plant
        });
    } catch (error) {
        console.error("Error getting plant:", error);

        res.status(500).json({
            error: "Failed to retrieve plant."
        });
    }
}

// POST /api/plants
async function createPlant(req, res) {
    try {
        const {
            ownerId,
            speciesId,
            nickname,
            healthStatus,
            healthNotes,
            location,
            acquiredAt,
            lastWateredAt,
            nextWateringAt,
            wateringRemindersEnabled,
            notificationSettings
        } = req.body;

        if (!ownerId || !speciesId || !nickname) {
            return res.status(400).json({
                error: "ownerId, speciesId, and nickname are required."
            });
        }

        if (!ObjectId.isValid(ownerId) || !ObjectId.isValid(speciesId)) {
            return res.status(400).json({
                error: "ownerId and speciesId must be valid IDs."
            });
        }

        const now = new Date();

        const newPlant = {
            ownerId: new ObjectId(ownerId),
            speciesId: new ObjectId(speciesId),
            nickname: nickname.trim(),
            picture: null,
            healthStatus: healthStatus || "healthy",
            healthNotes: healthNotes || "",
            location: location || "",
            acquiredAt: acquiredAt ? new Date(acquiredAt) : null,
            lastWateredAt: lastWateredAt
                ? new Date(lastWateredAt)
                : null,
            nextWateringAt: nextWateringAt
                ? new Date(nextWateringAt)
                : null,
            wateringRemindersEnabled:
                wateringRemindersEnabled ?? false,
            notificationSettings: {
                enabled: notificationSettings?.enabled ?? false,
                reminderTime:
                    notificationSettings?.reminderTime || "09:00",
                reminderDaysBefore:
                    notificationSettings?.reminderDaysBefore ?? 0
            },
            createdAt: now,
            updatedAt: now
        };

        const plantsCollection = getPlantsCollection();

        const result = await plantsCollection.insertOne(newPlant);

        res.status(201).json({
            message: "Plant created successfully.",
            plant: {
                _id: result.insertedId,
                ...newPlant
            }
        });
    } catch (error) {
        console.error("Error creating plant:", error);

        res.status(500).json({
            error: "Failed to create plant."
        });
    }
}

// PATCH /api/plants/:id
async function updatePlant(req, res) {
    try {
        const {id} = req.params;

        if(!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid plant ID."
            });
        }

        const allowedFields = [
            "nickname",
            "healthStatus",
            "healthNotes",
            "location",
            "acquiredAt",
            "lastWateredAt",
            "nextWateringAt",
            "wateringRemindersEnabled",
            "notificationSettings"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: "No valid fields were provided for updating."
            });
        }

        if (updates.nickname !== undefined) {
            if (
                typeof updates.nickname !== "string" || updates.nickname.trim() === ""
            ) {
                return res.status(400).json({
                    error: "Nickname must be a non-empty string."
                });
            }

            updates.nickname = updates.nickname.trim();
        }

        const dateFields = [
            "acquiredAt",
            "lastWateredAt",
            "nextWateringAt"
        ];

        for (const field of dateFields) {
            if (updates[field] !== undefined) {
                updates[field] = updates[field] ? new Date(updates[field]) : null;

                if (
                    updates[field] && Number.isNaN(updates[field].getTime())
                ) {
                    return res.status(400).json({
                        error: `${field} must be a valid date.`
                    });
                }
            }
        }

        updates.updatedAt = new Date();

        const plantsCollection = getPlantsCollection();

        const result = await plantsCollection.updateOne(
            {
                _id: new ObjectId(id)
            },
            {
                $set: updates
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                error: "Plant not found."
            });
        }

        const updatedPlant = await plantsCollection.findOne({
            _id: new ObjectId(id)
        });

        res.status(200).json({
            message: "Plant updated successfully.",
            plant: updatedPlant
        });
    } catch (error){
        console.error("Error updating plant:", error);

        res.status(500).json({
            error: "Failed to update plant."
        });
    }
}

// DELETE /api/plants/:id
async function deletePlant(req, res) {
    try {
        const {id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid plant ID"
            });
        }

        const plantsCollection = getPlantsCollection();

        const result = await plantsCollection.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Plant not found."
            });
        }

        res.status(200).json({
            message: "Plant deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting plant:", error);

        res.status(500).json({
            error: "Failed to delete plant."
        });
    }
}

// POST /api/plants/:id/water
async function waterPlant(req, res) {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                error: "Invalid plant ID."
            });
        }

        const plantsCollection = getPlantsCollection();

        const plant = await plantsCollection.findOne({
            _id: new ObjectId(id)
        });

        if (!plant) {
            return res.status(404).json({
                error: "Plant not found."
            });
        }

        const speciesCollection = client
            .db()
            .collection("plant_species");

        const species = await speciesCollection.findOne({
            _id: plant.speciesId
        });

        if (!species) {
            return res.status(404).json({
                error: "Plant species information was not found."
            });
        }

        const wateringIntervalDays = species.watering?.intervalDays;

        if (
            typeof wateringIntervalDays !== "number" || wateringIntervalDays < 1
        ) {
            return res.status(400).json({
                error: "This species does not have a valid watering interval."
            });
        }

        const wateredAt = req.body.wateredAt
            ? new Date(req.body.wateredAt)
            : new Date();

        if (Number.isNaN(wateredAt.getTime())) {
            return res.status(400).json({
                error: "wateredAt must be a valid date."
            });
        }

        const nextWateringAt = new Date(wateredAt);

        nextWateringAt.setDate(
            nextWateringAt.getDate() + wateringIntervalDays
        );

        await plantsCollection.updateOne(
            {
                _id: new ObjectId(id)
            },
            {
                $set: {
                    lastWateredAt: wateredAt,
                    nextWateringAt,
                    updatedAt: new Date()
                }
            }
        );

        const updatedPlant = await plantsCollection.findOne({
            _id: new ObjectId(id)
        });

        res.status(200).json({
            message: "Plant watering recorded successfully.",
            plant: updatedPlant
        });
    } catch (error) {
        console.error("Error recording plant watering:", error);

        res.status(500).json({
            error: "Failed to record plant watering."
        });
    }
}

module.exports = {
    getAllPlants,
    getPlantById,
    createPlant,
    updatePlant,
    deletePlant,
    waterPlant
};