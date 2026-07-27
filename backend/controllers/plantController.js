const { ObjectId } = require("mongodb");
const { client } = require("../config/db");

function getPlantsCollection() {
  return client.db().collection("userPlants");
}

function getSpeciesCollection() {
  return client.db().collection("plantSpecies");
}

const HEALTH_STATUSES = new Set([
  "healthy",
  "needs-attention",
  "sick",
  "recovering",
  "dormant",
  "dead",
]);

const LEGACY_HEALTH_STATUSES = {
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

function toObjectId(value) {
  if (value instanceof ObjectId) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    ObjectId.isValid(value._id)
  ) {
    return new ObjectId(value._id);
  }

  if (ObjectId.isValid(value)) {
    return new ObjectId(value);
  }

  return null;
}

/*
 * Supports current records:
 *
 * ownerId: ObjectId("...")
 *
 * and older records:
 *
 * ownerId: "..."
 */
function ownerFilter(ownerId) {
  return {
    ownerId: {
      $in: [
        ownerId,
        ownerId.toString(),
      ],
    },
  };
}

function ownedPlantFilter(
  ownerId,
  plantId,
) {
  return {
    _id: plantId,
    ...ownerFilter(ownerId),
  };
}

function normalizeHealthStatus(
  value = "healthy",
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (
    HEALTH_STATUSES.has(
      normalizedValue,
    )
  ) {
    return normalizedValue;
  }

  return (
    LEGACY_HEALTH_STATUSES[
      normalizedValue
    ] || null
  );
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

function addDays(
  date,
  numberOfDays,
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + numberOfDays,
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

  const rawReminderDaysBefore =
    source.reminderDaysBefore ??
    defaults.reminderDaysBefore ??
    0;

  const reminderDaysBefore =
    Number(rawReminderDaysBefore);

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
    !Number.isFinite(
      reminderDaysBefore,
    ) ||
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

/*
 * Adds the matching plantSpecies document
 * to each user plant.
 */
async function populatePlants(plants) {
  const speciesIds = [];
  const seenSpeciesIds = new Set();

  for (const plant of plants) {
    const speciesId = toObjectId(
      plant.speciesId,
    );

    if (!speciesId) {
      continue;
    }

    const key = speciesId.toString();

    if (!seenSpeciesIds.has(key)) {
      seenSpeciesIds.add(key);
      speciesIds.push(speciesId);
    }
  }

  let speciesDocuments = [];

  if (speciesIds.length > 0) {
    speciesDocuments =
      await getSpeciesCollection()
        .find({
          _id: {
            $in: speciesIds,
          },
        })
        .toArray();
  }

  const speciesById = new Map(
    speciesDocuments.map((species) => [
      species._id.toString(),
      species,
    ]),
  );

  return plants.map((plant) => {
    const speciesObjectId = toObjectId(
      plant.speciesId,
    );

    const species = speciesObjectId
      ? speciesById.get(
          speciesObjectId.toString(),
        ) || null
      : null;

    return {
      ...plant,

      /*
       * Existing frontend pages accept a
       * populated species object here.
       */
      speciesId:
        species || plant.speciesId,

      species,
    };
  });
}

async function findOwnedPlant(
  ownerId,
  plantId,
) {
  const plant =
    await getPlantsCollection().findOne(
      ownedPlantFilter(
        ownerId,
        plantId,
      ),
    );

  if (!plant) {
    return null;
  }

  const [populatedPlant] =
    await populatePlants([plant]);

  return populatedPlant;
}

/*
 * GET /api/user-plants
 */
async function getAllPlants(req, res) {
  try {
    const ownerId = getOwnerId(req, res);

    if (!ownerId) {
      return;
    }

    const plants =
      await getPlantsCollection()
        .find(ownerFilter(ownerId))
        .sort({
          createdAt: -1,
        })
        .toArray();

    const populatedPlants =
      await populatePlants(plants);

    return res.status(200).json({
      success: true,
      plants: populatedPlants,
      userPlants: populatedPlants,
      count: populatedPlants.length,
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

    const rawSpeciesId =
      req.body.speciesId &&
      typeof req.body.speciesId ===
        "object"
        ? req.body.speciesId._id
        : req.body.speciesId;

    const speciesId = toObjectId(
      rawSpeciesId,
    );

    if (!speciesId) {
      return sendError(
        res,
        400,
        "A valid plant species is required",
      );
    }

    const species =
      await getSpeciesCollection().findOne({
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

    const rawHealthNotes =
      req.body.healthNotes ??
      req.body.notes;

    const healthNotes =
      typeof rawHealthNotes === "string"
        ? rawHealthNotes.trim() || null
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

    const acquiredAt =
      parseOptionalDate(
        req.body.acquiredAt,
      );

    const lastWateredAt =
      parseOptionalDate(
        req.body.lastWateredAt,
      );

    let nextWateringAt =
      parseOptionalDate(
        req.body.nextWateringAt,
      );

    if (acquiredAt === undefined) {
      return sendError(
        res,
        422,
        "Acquired date is invalid",
      );
    }

    if (
      lastWateredAt === undefined
    ) {
      return sendError(
        res,
        422,
        "Last-watered date is invalid",
      );
    }

    if (
      nextWateringAt === undefined
    ) {
      return sendError(
        res,
        422,
        "Next-watering date is invalid",
      );
    }

    const wateringIntervalDays =
      Number(
        species.watering
          ?.intervalDays,
      );

    if (
      !nextWateringAt &&
      lastWateredAt &&
      Number.isFinite(
        wateringIntervalDays,
      ) &&
      wateringIntervalDays >= 1
    ) {
      nextWateringAt = addDays(
        lastWateredAt,
        wateringIntervalDays,
      );
    }

    const wateringRemindersEnabled =
      req.body
        .wateringRemindersEnabled ??
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
        req.body.notificationSettings,
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

    /*
     * The database requires ownerId
     * to be an ObjectId.
     */
    const newPlant = {
      ownerId,
      speciesId,
      nickname,
      picture: null,
      healthStatus,
      healthNotes,
      location,
      acquiredAt,
      lastWateredAt,
      nextWateringAt,
      wateringRemindersEnabled,
      notificationSettings,
      createdAt: now,
      updatedAt: now,
    };

    const result =
      await getPlantsCollection().insertOne(
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

    const collection =
      getPlantsCollection();

    const existingPlant =
      await collection.findOne(
        ownedPlantFilter(
          ownerId,
          plantId,
        ),
      );

    if (!existingPlant) {
      return sendError(
        res,
        404,
        "Plant not found",
      );
    }

    const updates = {
      /*
       * Migrates legacy string owner IDs
       * to the correct ObjectId format.
       */
      ownerId,
    };

    if (
      req.body.nickname !== undefined
    ) {
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

    if (
      req.body.location !== undefined
    ) {
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
      if (
        req.body[field] !== undefined
      ) {
        const date =
          parseOptionalDate(
            req.body[field],
          );

        if (date === undefined) {
          return sendError(
            res,
            422,
            `${field} must be a valid date`,
          );
        }

        updates[field] = date;
      }
    }

    if (
      req.body
        .wateringRemindersEnabled !==
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
          req.body
            .notificationSettings,

          existingPlant
            .notificationSettings,
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

    const suppliedChanges =
      Object.keys(updates).filter(
        (field) => field !== "ownerId",
      );

    if (
      suppliedChanges.length === 0
    ) {
      return sendError(
        res,
        400,
        "No valid fields were provided",
      );
    }

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
      const speciesId = toObjectId(
        existingPlant.speciesId,
      );

      if (speciesId) {
        const species =
          await getSpeciesCollection()
            .findOne({
              _id: speciesId,
            });

        const intervalDays =
          Number(
            species?.watering
              ?.intervalDays,
          );

        if (
          Number.isFinite(
            intervalDays,
          ) &&
          intervalDays >= 1
        ) {
          updates.nextWateringAt =
            addDays(
              updates.lastWateredAt,
              intervalDays,
            );
        }
      }
    }

    updates.updatedAt = new Date();

    await collection.updateOne(
      ownedPlantFilter(
        ownerId,
        plantId,
      ),
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

    const result =
      await getPlantsCollection()
        .deleteOne(
          ownedPlantFilter(
            ownerId,
            plantId,
          ),
        );

    if (
      result.deletedCount === 0
    ) {
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
 * PATCH or POST
 * /api/user-plants/:id/water
 */
async function waterPlant(req, res) {
  try {
    const ownerId = getOwnerId(req, res);
    const plantId = getPlantId(req, res);

    if (!ownerId || !plantId) {
      return;
    }

    const collection =
      getPlantsCollection();

    const plant =
      await collection.findOne(
        ownedPlantFilter(
          ownerId,
          plantId,
        ),
      );

    if (!plant) {
      return sendError(
        res,
        404,
        "Plant not found",
      );
    }

    const speciesId = toObjectId(
      plant.speciesId,
    );

    if (!speciesId) {
      return sendError(
        res,
        422,
        "The plant has an invalid species ID",
      );
    }

    const species =
      await getSpeciesCollection().findOne({
        _id: speciesId,
      });

    if (!species) {
      return sendError(
        res,
        404,
        "Plant species information was not found",
      );
    }

    const wateringIntervalDays =
      Number(
        species.watering
          ?.intervalDays,
      );

    if (
      !Number.isFinite(
        wateringIntervalDays,
      ) ||
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
        ? new Date(
            req.body.wateredAt,
          )
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

    await collection.updateOne(
      ownedPlantFilter(
        ownerId,
        plantId,
      ),
      {
        $set: {
          ownerId,
          lastWateredAt:
            wateredAt,
          nextWateringAt,
          updatedAt:
            new Date(),
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
