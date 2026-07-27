const { ObjectId } = require("mongodb");
const { client } = require("../config/db");

const journalEntriesCollection = () =>
  client.db().collection("journalEntries");

const userPlantsCollection = () =>
  client.db().collection("userPlants");

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

function serializeObjectId(value) {
  return value instanceof ObjectId
    ? value.toString()
    : value;
}

function serializeJournalEntry(entry) {
  return {
    ...entry,
    _id: serializeObjectId(entry._id),
    ownerId: serializeObjectId(entry.ownerId),
    userPlantId: serializeObjectId(entry.userPlantId),
    photos: Array.isArray(entry.photos)
      ? entry.photos.map((photo) => ({
          ...photo,
          fileId: serializeObjectId(photo.fileId),
        }))
      : [],
  };
}

function normalizeHealthStatus(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (allowedHealthStatuses.has(trimmedValue)) {
    return trimmedValue;
  }

  return legacyHealthStatuses[trimmedValue];
}

function parseEntryDate(value) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizePhotos(value) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const photos = [];

  for (const photo of value) {
    if (
      !photo ||
      typeof photo !== "object" ||
      !ObjectId.isValid(photo.fileId) ||
      typeof photo.filename !== "string" ||
      !photo.filename.trim() ||
      typeof photo.contentType !== "string" ||
      !photo.contentType.trim()
    ) {
      return null;
    }

    const caption =
      typeof photo.caption === "string"
        ? photo.caption.trim() || null
        : null;

    if (caption && caption.length > 300) {
      return null;
    }

    photos.push({
      fileId: new ObjectId(photo.fileId),
      filename: photo.filename.trim(),
      contentType: photo.contentType.trim(),
      caption,
    });
  }

  return photos;
}

async function getJournalEntries(req, res) {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const ownerId = new ObjectId(req.userId);

    const entries = await journalEntriesCollection()
      .find({ ownerId })
      .sort({
        entryDate: -1,
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      entries: entries.map(serializeJournalEntry),
    });
  } catch (error) {
    console.error(
      "Get journal entries error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve journal entries",
    });
  }
}

async function createJournalEntry(req, res) {
  try {
    if (!ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const ownerId = new ObjectId(req.userId);

    const rawUserPlantId =
      req.body.userPlantId ??
      req.body.plantId;

    if (!ObjectId.isValid(rawUserPlantId)) {
      return res.status(400).json({
        success: false,
        message: "A valid plant is required",
      });
    }

    const userPlantId =
      new ObjectId(rawUserPlantId);

    const body =
      typeof req.body.body === "string"
        ? req.body.body.trim()
        : typeof req.body.notes === "string"
          ? req.body.notes.trim()
          : "";

    if (!body) {
      return res.status(400).json({
        success: false,
        message: "Journal notes are required",
      });
    }

    if (body.length > 10000) {
      return res.status(422).json({
        success: false,
        message:
          "Journal notes cannot exceed 10,000 characters",
      });
    }

    const title =
      typeof req.body.title === "string"
        ? req.body.title.trim() || null
        : null;

    if (title && title.length > 150) {
      return res.status(422).json({
        success: false,
        message:
          "The journal title cannot exceed 150 characters",
      });
    }

    const healthStatus =
      normalizeHealthStatus(
        req.body.healthStatus ??
          req.body.health
      );

    if (healthStatus === undefined) {
      return res.status(422).json({
        success: false,
        message:
          "Enter a valid plant health status",
      });
    }

    if (
      req.body.watered !== undefined &&
      typeof req.body.watered !== "boolean"
    ) {
      return res.status(422).json({
        success: false,
        message: "Watered must be true or false",
      });
    }

    const entryDate = parseEntryDate(
      req.body.entryDate ??
        req.body.occurredAt
    );

    if (!entryDate) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid journal date",
      });
    }

    const photos =
      normalizePhotos(req.body.photos);

    if (!photos) {
      return res.status(422).json({
        success: false,
        message:
          "One or more journal photos are invalid",
      });
    }

    const plant =
      await userPlantsCollection().findOne({
        _id: userPlantId,
        ownerId,
      });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message:
          "The selected plant was not found",
      });
    }

    const now = new Date();

    const journalEntry = {
      ownerId,
      userPlantId,
      title,
      body,
      healthStatus,
      watered: req.body.watered ?? false,
      entryDate,
      photos,
      createdAt: now,
      updatedAt: now,
    };

    const result =
      await journalEntriesCollection().insertOne(
        journalEntry
      );

    const createdEntry = {
      ...journalEntry,
      _id: result.insertedId,
    };

    return res.status(201).json({
      success: true,
      message: "Journal entry created",
      entry:
        serializeJournalEntry(createdEntry),
    });
  } catch (error) {
    console.error(
      "Create journal entry error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create journal entry",
    });
  }
}

module.exports = {
  getJournalEntries,
  createJournalEntry,
};
