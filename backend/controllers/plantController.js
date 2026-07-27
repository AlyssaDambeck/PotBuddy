const { ObjectId } = require("mongodb");
const { client } = require("../config/db");

function getPlantsCollection() {
  return client.db().collection("userPlants");
}

function getSpeciesCollection() {
  return client.db().collection("plantSpecies");
}

const allowedHealthStatuses = new Set([
  "healthy",
  "needs-attention",
  "sick",
  "recovering",
  "dormant",
  "dead",
]);

const legacyHealthStatuses = {
  Healthy: "healthy",
  "Needs attention": "needs-attention",
  "Needs Attention": "needs-attention",
  Sick: "sick",
  Recovering: "recovering",
  Dormant: "dormant",
  Dead: "dead",
};

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function getOwnerId(req, res) {
  if (!ObjectId.isValid(req.userId)) {
    sendError(
      res,
      401,
      "Invalid authentication token",
    );

    return null;
  }

  return new ObjectId(req.userId);
}

function getPlantId(req, res) {
  if (!ObjectId.isValid(req.params.id)) {
    sendError(
      res,
      400,
      "Invalid plant ID",
    );

    return null;
  }

  return new ObjectId(req.params.id);
}

function normalizeHealthStatus(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (allowedHealthStatuses.has(trimmedValue)) {
    return trimmedValue;
  }

  return legacyHealthStatuses[trimmedValue] || null;
}

function parseOptionalDate(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function addDays(date, days) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + days,
  );

  return result;
}

function normalizeNotificationSettings(
  value,
  defaults = {},
) {
  const source =
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};

  const enabled =
    source.enabled ??
    defaults.enabled ??
    false;

  const reminderTime =
    source.reminderTime ??
    defaults.reminderTime ??
    "09:00";

  const reminderDaysBefore =
    source.reminderDaysBefore ??
    defaults.reminderDaysBefore ??
    0;

  if (typeof enabled !== "boolean") {
    return null;
  }

  if (
    typeof reminderTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      reminderTime,
    )
  ) {
    return null;
  }

  if (
    typeof reminderDaysBefore !== "number" ||
    !Number.isFinite(reminderDaysBefore) ||
    reminderDaysBefore < 0
  ) {
    return null;
  }

  return {
    enabled,
    reminderTime,
    reminderDaysBefore,
  };
}

function plantLookupPipeline(match) {
  return [
    {
      $match: match,
    },
    {
      $lookup: {
        from: "plantSpecies",
        localField: "speciesId",
        foreignField: "_id",
        as: "species",
      },
    },
    {
      $unwind: {
        path: "$species",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
}

/*
 * The frontend accepts speciesId as either:
 * - the original ObjectId/string
 * - a populated species object
 *
 * Returning the populated object here keeps the Dashboard,
 * Inventory, Journal, and Plant Detail pages compatible.
 */
function shapePlant(plant) {
  if (!plant) {
    return null;
  }

  const populatedSpecies =
    plant.species || null;

  return {
    ...plant,
    speciesId:
      populatedSpecies ||
      plant.speciesId,
    species: populatedSpecies,
  };
}

async function findOwnedPlant(
  ownerId,
  plantId,
) {
  const plantsCollection =
    getPlantsCollection();

  const [plant] = await plantsCollection
    .aggregate(
      plantLookupPipeline({
        _id: plantId,
        ownerId,
      }),
    )
    .toArray();

  return shapePlant(plant);
}

/*
 * GET /api/user-plants
 *
 * Returns only plants owned by the authenticated user.
 * An account with no plants receives plants: [] and status 200.
 */
async function getAllPlants(req, res) {
  try {
    const ownerId = getOwnerId(req, res);

    if (!ownerId) {
      return;
    }

    const plantsCollection =
      getPlantsCollection();

    const plants = await plantsCollection
      .aggregate([
        ...plantLookupPipeline({
          ownerId,
        }),
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      plants: plants.map(shapePlant),
      count: plants.length,
    });
  } catch (error) {
    console.error(
      "Error getting plants:",
      error,
    );

    return sendError(
      res,
      500,
      "Failed to retrieve plants",
    );
  }
}

/*
 * GET /api/user-plants/:id
 */
async function getPlantById(req, res) {
  try {
    const ownerId = getOwnerId(req, res);
    const plantId = getPlantId(req, res);

    if (!ownerId || !plantId) {
      return;
    }

    const plant = await findOwnedPlant(
      ownerId,
      plantId,
    );

    if (!plant) {
      return sendError(
        res,
        404,
        "Plant not found",
      );
    }

    return res.status(200).json({
      success: true,
      plant,
    });
  } catch (error) {
    console.error(
      "Error getting plant:",
      error,
    );

    return sendError(
      res,
      500,
      "Failed to retrieve plant",
    );
  }
}

/*
 * POST /api/user-plants
 */
async function createPlant(req, res) {
  try {
    const ownerId = getOwnerId(req, res);

    if (!ownerId) {
      return;
    }

    const {
      speciesId: rawSpeciesId,
      nickname: rawNickname,
      healthNotes,
      notes,
      location,
      acquiredAt: rawAcquiredAt,
      lastWateredAt: rawLastWateredAt,
      nextWateringAt: rawNextWateringAt,
      wateringRemindersEnabled:
        rawWateringRemindersEnabled,
      notificationSettings:
        rawNotificationSettings,
    } = req.body;

    if (!ObjectId.isValid(rawSpeciesId)) {
      return sendError(
        res,
        400,
        "A valid plant species is required",
      );
    }

    const speciesId =
      new ObjectId(rawSpeciesId);

    const speciesCollection =
      getSpeciesCollection();

    const species =
      await speciesCollection.findOne({
        _id: speciesId,
      });

    if (!species) {
      return sendError(
        res,
        404,
        "Plant species not found",
      );
    }

    const nickname =
      typeof rawNickname === "string"
        ? rawNickname.trim()
        : "";

    if (
      !nickname ||
      nickname.length > 100
    ) {
      return sendError(
        res,
        422,
        "Nickname must be between 1 and 100 characters",
      );
    }

    const healthStatus =
      normalizeHealthStatus(
        req.body.healthStatus ??
          req.body.health ??
          "healthy",
      );

    if (!healthStatus) {
      return sendError(
        res,
        422,
        "Invalid plant health status",
      );
    }

    const normalizedHealthNotes =
      typeof healthNotes === "string"
        ? healthNotes.trim() || null
        : typeof notes === "string"
          ? notes.trim() || null
          : null;

    if (
      normalizedHealthNotes &&
      normalizedHealthNotes.length > 3000
    ) {
      return sendError(
        res,
        422,
        "Health notes cannot exceed 3,000 characters",
      );
    }

    const normalizedLocation =
      typeof location === "string"
        ? location.trim() || null
        : null;

    if (
      normalizedLocation &&
      normalizedLocation.length > 200
    ) {
      return sendError(
        res,
        422,
        "Location cannot exceed 200 characters",
      );
    }

    const acquiredAt =
      parseOptionalDate(rawAcquiredAt);

    if (acquiredAt === undefined) {
      return sendError(
        res,
        422,
        "Acquired date is invalid",
      );
    }

    const lastWateredAt =
      parseOptionalDate(
        rawLastWateredAt,
      );

    if (lastWateredAt === undefined) {
      return sendError(
        res,
        422,
        "Last-watered date is invalid",
      );
    }

    let nextWateringAt =
      parseOptionalDate(
        rawNextWateringAt,
      );

    if (nextWateringAt === undefined) {
      return sendError(
        res,
        422,
        "Next-watering date is invalid",
      );
    }

    /*
     * Calculate the next watering date when the
     * frontend supplies lastWateredAt but not
     * nextWateringAt.
     */
    const wateringIntervalDays =
      species.watering?.intervalDays;

    if (
      !nextWateringAt &&
      lastWateredAt &&
      typeof wateringIntervalDays ===
        "number" &&
      wateringIntervalDays >= 1
    ) {
      nextWateringAt = addDays(
        lastWateredAt,
        wateringIntervalDays,
      );
    }

    const wateringRemindersEnabled =
      rawWateringRemindersEnabled ??
      false;

    if (
      typeof wateringRemindersEnabled !==
      "boolean"
    ) {
      return sendError(
        res,
        422,
        "Watering reminders must be true or false",
      );
    }

    const notificationSettings =
      normalizeNotificationSettings(
        rawNotificationSettings,
        {
          enabled:
            wateringRemindersEnabled,
          reminderTime: "09:00",
          reminderDaysBefore: 0,
        },
      );

    if (!notificationSettings) {
      return sendError(
        res,
        422,
        "Notification settings are invalid",
      );
    }

    const now = new Date();

    const newPlant = {
      ownerId,
      speciesId,
      nickname,
      picture: null,
      healthStatus,
      healthNotes:
        normalizedHealthNotes,
      location:
        normalizedLocation,
      acquiredAt,
      lastWateredAt,
      nextWateringAt,
      wateringRemindersEnabled,
      notificationSettings,
      createdAt: now,
      updatedAt: now,
    };

    const plantsCollection =
      getPlantsCollection();

    const result =
      await plantsCollection.insertOne(
        newPlant,
      );

    const createdPlant =
      await findOwnedPlant(
        ownerId,
        result.insertedId,
      );

    return res.status(201).json({
      success: true,
      message:
        "Plant created successfully",
      plant: createdPlant,
    });
  } catch (error) {
    console.error(
      "Error creating plant:",
      error,
    );

    return sendError(
      res,
      500,
      "Failed to create plant",
    );
  }
}

/*
 * PATCH /api/user-plants/:id
 */
async function updatePlant(req, res) {
  try {
    const ownerId = getOwnerId(req, res);
    const plantId = getPlantId(req, res);

    if (!ownerId || !plantId) {
      return;
    }

    const plantsCollection =
      getPlantsCollection();

    const existingPlant =
      await plantsCollection.findOne({
        _id: plantId,
        ownerId,
      });

    if (!existingPlant) {
      return sendError(
        res,
        404,
        "Plant not found",
      );
    }

    const updates = {};

    if (req.body.nickname !== undefined) {
      const nickname =
        typeof req.body.nickname ===
        "string"
          ? req.body.nickname.trim()
          : "";

      if (
        !nickname ||
        nickname.length > 100
      ) {
        return sendError(
          res,
          422,
          "Nickname must be between 1 and 100 characters",
        );
      }

      updates.nickname = nickname;
    }

    if (
      req.body.healthStatus !==
        undefined ||
      req.body.health !== undefined
    ) {
      const healthStatus =
        normalizeHealthStatus(
          req.body.healthStatus ??
            req.body.health,
        );

      if (!healthStatus) {
        return sendError(
          res,
          422,
          "Invalid plant health status",
        );
      }

      updates.healthStatus =
        healthStatus;
    }

    if (
      req.body.healthNotes !==
        undefined ||
      req.body.notes !== undefined
    ) {
      const value =
        req.body.healthNotes ??
        req.body.notes;

      if (
        value !== null &&
        typeof value !== "string"
      ) {
        return sendError(
          res,
          422,
          "Health notes must be text",
        );
      }

      const healthNotes =
        typeof value === "string"
          ? value.trim() || null
          : null;

      if (
        healthNotes &&
        healthNotes.length > 3000
      ) {
        return sendError(
          res,
          422,
          "Health notes cannot exceed 3,000 characters",
        );
      }

      updates.healthNotes =
        healthNotes;
    }

    if (req.body.location !== undefined) {
      if (
        req.body.location !== null &&
        typeof req.body.location !==
          "string"
      ) {
        return sendError(
          res,
          422,
          "Location must be text",
        );
      }

      const location =
        typeof req.body.location ===
        "string"
          ? req.body.location.trim() ||
            null
          : null;

      if (
        location &&
        location.length > 200
      ) {
        return sendError(
          res,
          422,
          "Location cannot exceed 200 characters",
        );
      }

      updates.location = location;
    }

    const dateFields = [
      "acquiredAt",
      "lastWateredAt",
      "nextWateringAt",
    ];

    for (const field of dateFields) {
      if (req.body[field] !== undefined) {
        const parsedDate =
          parseOptionalDate(
            req.body[field],
          );

        if (parsedDate === undefined) {
          return sendError(
            res,
            422,
            `${field} must be a valid date`,
          );
        }

        updates[field] = parsedDate;
      }
    }

    if (
      req.body.wateringRemindersEnabled !==
      undefined
    ) {
      if (
        typeof req.body
          .wateringRemindersEnabled !==
        "boolean"
      ) {
        return sendError(
          res,
          422,
          "Watering reminders must be true or false",
        );
      }

      updates.wateringRemindersEnabled =
        req.body
          .wateringRemindersEnabled;
    }

    if (
      req.body.notificationSettings !==
      undefined
    ) {
      const notificationSettings =
        normalizeNotificationSettings(
          req.body.notificationSettings,
          existingPlant.notificationSettings,
        );

      if (!notificationSettings) {
        return sendError(
          res,
          422,
          "Notification settings are invalid",
        );
      }

      updates.notificationSettings =
        notificationSettings;
    }

    if (Object.keys(updates).length === 0) {
      return sendError(
        res,
        400,
        "No valid fields were provided",
      );
    }

    /*
     * Recalculate nextWateringAt when the user changes
     * lastWateredAt but does not send nextWateringAt.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        updates,
        "lastWateredAt",
      ) &&
      !Object.prototype.hasOwnProperty.call(
        updates,
        "nextWateringAt",
      ) &&
      updates.lastWateredAt
    ) {
      const species =
        await getSpeciesCollection().findOne({
          _id: existingPlant.speciesId,
        });

      const intervalDays =
        species?.watering?.intervalDays;

      if (
        typeof intervalDays === "number" &&
        intervalDays >= 1
      ) {
        updates.nextWateringAt =
          addDays(
            updates.lastWateredAt,
            intervalDays,
          );
      }
    }

    updates.updatedAt = new Date();

    await plantsCollection.updateOne(
      {
        _id: plantId,
        ownerId,
      },
      {
        $set: updates,
      },
    );

    const updatedPlant =
      await findOwnedPlant(
        ownerId,
        plantId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Plant updated successfully",
      plant: updatedPlant,
    });
  } catch (error) {
    console.error(
      "Error updating plant:",
      error,
    );

    return sendError(
      res,
      500,
      "Failed to update plant",
    );
  }
}

/*
 * DELETE /api/user-plants/:id
 */
async function deletePlant(req, res) {
  try {
    const ownerId = getOwnerId(req, res);
    const plantId = getPlantId(req, res);

    if (!ownerId || !plantId) {
      return;
    }

    const plantsCollection =
      getPlantsCollection();

    const result =
      await plantsCollection.deleteOne({
        _id: plantId,
        ownerId,
      });

    if (result.deletedCount === 0) {
      return sendError(
        res,
        404,
        "Plant not found",
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Plant deleted successfully",
    });
  } catch (error) {
    console.error(
      "Error deleting plant:",
      error,
    );

    return sendError(
      res,
      500,
      "Failed to delete plant",
    );
  }
}

/*
 * PATCH or POST /api/user-plants/:id/water
 */
async function waterPlant(req, res) {
  try {
    const ownerId = getOwnerId(req, res);
    const plantId = getPlantId(req, res);

    if (!ownerId || !plantId) {
      return;
    }

    const plantsCollection =
      getPlantsCollection();

    const plant =
      await plantsCollection.findOne({
        _id: plantId,
        ownerId,
      });

    if (!plant) {
      return sendError(
        res,
        404,
        "Plant not found",
      );
    }

    const species =
      await getSpeciesCollection().findOne({
        _id: plant.speciesId,
      });

    if (!species) {
      return sendError(
        res,
        404,
        "Plant species information was not found",
      );
    }

    const wateringIntervalDays =
      species.watering?.intervalDays;

    if (
      typeof wateringIntervalDays !==
        "number" ||
      wateringIntervalDays < 1
    ) {
      return sendError(
        res,
        422,
        "This species does not have a valid watering interval",
      );
    }

    const wateredAt =
      req.body.wateredAt
        ? new Date(req.body.wateredAt)
        : new Date();

    if (
      Number.isNaN(
        wateredAt.getTime(),
      )
    ) {
      return sendError(
        res,
        422,
        "wateredAt must be a valid date",
      );
    }

    const nextWateringAt =
      addDays(
        wateredAt,
        wateringIntervalDays,
      );

    await plantsCollection.updateOne(
      {
        _id: plantId,
        ownerId,
      },
      {
        $set: {
          lastWateredAt: wateredAt,
          nextWateringAt,
          updatedAt: new Date(),
        },
      },
    );

    const updatedPlant =
      await findOwnedPlant(
        ownerId,
        plantId,
      );

    return res.status(200).json({
      success: true,
      message:
        "Plant watering recorded successfully",
      plant: updatedPlant,
    });
  } catch (error) {
    console.error(
      "Error recording plant watering:",
      error,
    );

    return sendError(
      res,
      500,
      "Failed to record plant watering",
    );
  }
}

module.exports = {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  waterPlant,
};
