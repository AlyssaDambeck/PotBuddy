/*
 * PotBuddy MongoDB initialization script
 *
 * Creates:
 *   - users
 *   - plantSpecies
 *   - userPlants
 *   - journalEntries
 *   - plantPhotos.files
 *   - plantPhotos.chunks
 *
 * Also creates indexes and seeds one Snake Plant care guide.
 *
 * Run with:
 *   mongosh "$MONGODB_URI" --file init.mongodb.js
 */

db = db.getSiblingDB("potbuddy");

/*
 * Creates a collection if it does not exist.
 * Updates its validator if it already exists.
 */
function createOrUpdateCollection(name, schema) {
  const validator = {
    $jsonSchema: schema
  };

  const exists = db.getCollectionInfos({ name }).length > 0;

  if (!exists) {
    db.createCollection(name, {
      validator,
      validationLevel: "strict",
      validationAction: "error"
    });

    print(`Created collection: ${name}`);
    return;
  }

  const result = db.runCommand({
    collMod: name,
    validator,
    validationLevel: "strict",
    validationAction: "error"
  });

  if (result.ok) {
    print(`Updated collection validator: ${name}`);
  } else {
    print(`Could not update validator for ${name}`);
    printjson(result);
  }
}

function createCollectionIfMissing(name) {
  const exists = db.getCollectionInfos({ name }).length > 0;

  if (!exists) {
    db.createCollection(name);
    print(`Created collection: ${name}`);
  }
}

/*
 * Reusable GridFS image-reference schema.
 *
 * fileId references plantPhotos.files._id.
 */
const imageReferenceSchema = {
  bsonType: ["object", "null"],

  properties: {
    fileId: {
      bsonType: "objectId",
      description: "References plantPhotos.files._id"
    },

    filename: {
      bsonType: "string"
    },

    contentType: {
      bsonType: "string"
    },

    altText: {
      bsonType: ["string", "null"]
    }
  }
};

/*
 * USERS
 *
 * Supports:
 *   - email/password registration
 *   - Google login
 *   - email verification
 *   - choosing one owned plant as the featured/profile plant
 */
createOrUpdateCollection("users", {
  bsonType: "object",

  required: [
    "username",
    "email",
    "authProvider",
    "emailVerified",
    "createdAt",
    "updatedAt"
  ],

  properties: {
    _id: {
      bsonType: "objectId"
    },

    username: {
      bsonType: "string",
      minLength: 3,
      maxLength: 30
    },

    email: {
      bsonType: "string",
      minLength: 3,
      maxLength: 320
    },

    passwordHash: {
      bsonType: ["string", "null"],
      description: "Hashed password; never store a plain-text password"
    },

    googleId: {
      bsonType: ["string", "null"]
    },

    authProvider: {
      enum: [
        "local",
        "google",
        "both"
      ]
    },

    emailVerified: {
      bsonType: "bool"
    },

    emailVerificationTokenHash: {
      bsonType: ["string", "null"]
    },

    emailVerificationExpiresAt: {
      bsonType: ["date", "null"]
    },

    featuredPlantId: {
      bsonType: ["objectId", "null"],
      description: "References userPlants._id"
    },

    createdAt: {
      bsonType: "date"
    },

    updatedAt: {
      bsonType: "date"
    }
  }
});

/*
 * PLANT SPECIES
 *
 * Shared plant-care catalog.
 *
 * Each of your top 25 plant species should have one document
 * in this collection.
 */
createOrUpdateCollection("plantSpecies", {
  bsonType: "object",

  required: [
    "commonName",
    "scientificName",
    "sunlight",
    "watering",
    "humidity",
    "temperature",
    "commonDiseases",
    "createdAt",
    "updatedAt"
  ],

  properties: {
    _id: {
      bsonType: "objectId"
    },

    commonName: {
      bsonType: "string",
      minLength: 1,
      maxLength: 150
    },

    scientificName: {
      bsonType: "string",
      minLength: 1,
      maxLength: 200
    },

    aliases: {
      bsonType: "array",
      items: {
        bsonType: "string"
      }
    },

    description: {
      bsonType: ["string", "null"],
      maxLength: 5000
    },

    defaultImage: imageReferenceSchema,

    sunlight: {
      bsonType: "object",

      required: [
        "level",
        "instructions"
      ],

      properties: {
        level: {
          enum: [
            "low",
            "indirect",
            "bright-indirect",
            "partial-sun",
            "full-sun"
          ]
        },

        instructions: {
          bsonType: "string"
        }
      }
    },

    watering: {
      bsonType: "object",

      required: [
        "intervalDays",
        "instructions"
      ],

      properties: {
        intervalDays: {
          bsonType: [
            "int",
            "long",
            "double",
            "decimal"
          ],
          minimum: 1
        },

        instructions: {
          bsonType: "string"
        },

        warningSigns: {
          bsonType: "array",
          items: {
            bsonType: "string"
          }
        }
      }
    },

    humidity: {
      bsonType: "object",

      required: [
        "level",
        "instructions"
      ],

      properties: {
        level: {
          enum: [
            "low",
            "average",
            "high"
          ]
        },

        instructions: {
          bsonType: "string"
        }
      }
    },

    temperature: {
      bsonType: "object",

      required: [
        "minimum",
        "maximum",
        "unit"
      ],

      properties: {
        minimum: {
          bsonType: [
            "int",
            "long",
            "double",
            "decimal"
          ]
        },

        maximum: {
          bsonType: [
            "int",
            "long",
            "double",
            "decimal"
          ]
        },

        unit: {
          enum: [
            "F",
            "C"
          ]
        }
      }
    },

    soil: {
      bsonType: ["string", "null"]
    },

    fertilizing: {
      bsonType: ["object", "null"],

      properties: {
        intervalDays: {
          bsonType: [
            "int",
            "long",
            "double",
            "decimal",
            "null"
          ],
          minimum: 1
        },

        instructions: {
          bsonType: ["string", "null"]
        }
      }
    },

    toxicity: {
      bsonType: ["object", "null"],

      properties: {
        toxicToPets: {
          bsonType: "bool"
        },

        notes: {
          bsonType: ["string", "null"]
        }
      }
    },

    commonDiseases: {
      bsonType: "array",

      items: {
        bsonType: "object",

        required: [
          "name",
          "symptoms",
          "cause",
          "treatment"
        ],

        properties: {
          name: {
            bsonType: "string"
          },

          symptoms: {
            bsonType: "array",
            items: {
              bsonType: "string"
            }
          },

          cause: {
            bsonType: "string"
          },

          treatment: {
            bsonType: "array",
            items: {
              bsonType: "string"
            }
          },

          image: imageReferenceSchema
        }
      }
    },

    additionalCareNotes: {
      bsonType: "array",
      items: {
        bsonType: "string"
      }
    },

    createdAt: {
      bsonType: "date"
    },

    updatedAt: {
      bsonType: "date"
    }
  }
});

/*
 * USER PLANTS
 *
 * Represents a physical plant owned by a particular user.
 *
 * ownerId   -> users._id
 * speciesId -> plantSpecies._id
 */
createOrUpdateCollection("userPlants", {
  bsonType: "object",

  required: [
    "ownerId",
    "speciesId",
    "nickname",
    "healthStatus",
    "wateringRemindersEnabled",
    "notificationSettings",
    "createdAt",
    "updatedAt"
  ],

  properties: {
    _id: {
      bsonType: "objectId"
    },

    ownerId: {
      bsonType: "objectId",
      description: "References users._id"
    },

    speciesId: {
      bsonType: "objectId",
      description: "References plantSpecies._id"
    },

    nickname: {
      bsonType: "string",
      minLength: 1,
      maxLength: 100
    },

    picture: imageReferenceSchema,

    healthStatus: {
      enum: [
        "healthy",
        "needs-attention",
        "sick",
        "recovering",
        "dormant",
        "dead"
      ]
    },

    healthNotes: {
      bsonType: ["string", "null"],
      maxLength: 3000
    },

    location: {
      bsonType: ["string", "null"],
      maxLength: 200
    },

    acquiredAt: {
      bsonType: ["date", "null"]
    },

    lastWateredAt: {
      bsonType: ["date", "null"]
    },

    nextWateringAt: {
      bsonType: ["date", "null"]
    },

    wateringRemindersEnabled: {
      bsonType: "bool"
    },

    notificationSettings: {
      bsonType: "object",

      required: [
        "enabled",
        "reminderTime",
        "reminderDaysBefore"
      ],

      properties: {
        enabled: {
          bsonType: "bool"
        },

        reminderTime: {
          bsonType: "string",
          pattern: "^([01]\\d|2[0-3]):[0-5]\\d$"
        },

        reminderDaysBefore: {
          bsonType: [
            "int",
            "long",
            "double",
            "decimal"
          ],
          minimum: 0
        }
      }
    },

    createdAt: {
      bsonType: "date"
    },

    updatedAt: {
      bsonType: "date"
    }
  }
});

/*
 * JOURNAL ENTRIES
 *
 * ownerId     -> users._id
 * userPlantId -> userPlants._id
 * photos      -> files stored in GridFS
 */
createOrUpdateCollection("journalEntries", {
  bsonType: "object",

  required: [
    "ownerId",
    "userPlantId",
    "body",
    "watered",
    "entryDate",
    "photos",
    "createdAt",
    "updatedAt"
  ],

  properties: {
    _id: {
      bsonType: "objectId"
    },

    ownerId: {
      bsonType: "objectId",
      description: "References users._id"
    },

    userPlantId: {
      bsonType: "objectId",
      description: "References userPlants._id"
    },

    title: {
      bsonType: ["string", "null"],
      maxLength: 150
    },

    body: {
      bsonType: "string",
      minLength: 1,
      maxLength: 10000
    },

    healthStatus: {
      enum: [
        null,
        "healthy",
        "needs-attention",
        "sick",
        "recovering",
        "dormant",
        "dead"
      ]
    },

    watered: {
      bsonType: "bool"
    },

    entryDate: {
      bsonType: "date"
    },

    photos: {
      bsonType: "array",

      items: {
        bsonType: "object",

        required: [
          "fileId",
          "filename",
          "contentType"
        ],

        properties: {
          fileId: {
            bsonType: "objectId",
            description: "References plantPhotos.files._id"
          },

          filename: {
            bsonType: "string"
          },

          contentType: {
            bsonType: "string"
          },

          caption: {
            bsonType: ["string", "null"],
            maxLength: 300
          }
        }
      }
    },

    createdAt: {
      bsonType: "date"
    },

    updatedAt: {
      bsonType: "date"
    }
  }
});

/*
 * GRIDFS PHOTO COLLECTIONS
 *
 * The backend will use a GridFS bucket named "plantPhotos".
 */
createCollectionIfMissing("plantPhotos.files");
createCollectionIfMissing("plantPhotos.chunks");

/*
 * USER INDEXES
 */
db.users.createIndex(
  {
    username: 1
  },
  {
    unique: true,
    name: "unique_username"
  }
);

db.users.createIndex(
  {
    email: 1
  },
  {
    unique: true,
    name: "unique_email"
  }
);

db.users.createIndex(
  {
    googleId: 1
  },
  {
    unique: true,
    name: "unique_google_id",
    partialFilterExpression: {
      googleId: {
        $type: "string"
      }
    }
  }
);

/*
 * PLANT-SPECIES INDEXES
 */
db.plantSpecies.createIndex(
  {
    commonName: 1
  },
  {
    unique: true,
    name: "unique_plant_common_name"
  }
);

db.plantSpecies.createIndex(
  {
    scientificName: 1
  },
  {
    unique: true,
    name: "unique_plant_scientific_name"
  }
);

db.plantSpecies.createIndex(
  {
    commonName: "text",
    scientificName: "text",
    aliases: "text"
  },
  {
    name: "plant_species_text_search"
  }
);

/*
 * USER-PLANT INDEXES
 */
db.userPlants.createIndex(
  {
    ownerId: 1,
    createdAt: -1
  },
  {
    name: "user_plants_by_owner"
  }
);

db.userPlants.createIndex(
  {
    ownerId: 1,
    nextWateringAt: 1
  },
  {
    name: "watering_reminders_by_owner"
  }
);

db.userPlants.createIndex(
  {
    speciesId: 1
  },
  {
    name: "user_plants_by_species"
  }
);

/*
 * JOURNAL INDEXES
 */
db.journalEntries.createIndex(
  {
    userPlantId: 1,
    entryDate: -1
  },
  {
    name: "journal_entries_by_plant"
  }
);

db.journalEntries.createIndex(
  {
    ownerId: 1,
    entryDate: -1
  },
  {
    name: "journal_entries_by_owner"
  }
);

/*
 * GRIDFS INDEXES
 */
db.getCollection("plantPhotos.files").createIndex(
  {
    filename: 1,
    uploadDate: 1
  },
  {
    name: "gridfs_files_by_name"
  }
);

db.getCollection("plantPhotos.chunks").createIndex(
  {
    files_id: 1,
    n: 1
  },
  {
    unique: true,
    name: "gridfs_unique_chunks"
  }
);

/*
 * EXAMPLE SEED RECORD: SNAKE PLANT
 *
 * Add the remaining plant species using the same structure.
 */
const now = new Date();

db.plantSpecies.updateOne(
  {
    scientificName: "Dracaena trifasciata"
  },
  {
    $set: {
      commonName: "Snake Plant",

      aliases: [
        "Sansevieria",
        "Mother-in-law's Tongue"
      ],

      description:
        "A popular indoor plant with upright, drought-tolerant leaves.",

      defaultImage: null,

      sunlight: {
        level: "indirect",
        instructions:
          "Place in bright indirect light. It can tolerate lower-light conditions."
      },

      watering: {
        intervalDays: 14,
        instructions:
          "Allow the soil to dry before watering thoroughly.",

        warningSigns: [
          "Yellow leaves",
          "Soft leaves",
          "Mushy roots"
        ]
      },

      humidity: {
        level: "low",
        instructions:
          "Normal household humidity is usually sufficient."
      },

      temperature: {
        minimum: 65,
        maximum: 85,
        unit: "F"
      },

      soil:
        "Use loose, well-draining cactus or succulent soil.",

      fertilizing: {
        intervalDays: 30,
        instructions:
          "Fertilize lightly during the spring and summer."
      },

      toxicity: {
        toxicToPets: true,
        notes:
          "May cause irritation if eaten by a cat or dog."
      },

      commonDiseases: [
        {
          name: "Root Rot",

          symptoms: [
            "Yellow leaves",
            "Soft roots",
            "Mushy leaf bases"
          ],

          cause:
            "Excess moisture or soil with poor drainage.",

          treatment: [
            "Remove damaged roots",
            "Repot in dry, well-draining soil",
            "Reduce watering frequency"
          ],

          image: null
        },

        {
          name: "Brown Spots",

          symptoms: [
            "Brown leaf patches",
            "Dry leaf edges"
          ],

          cause:
            "Possible overwatering, harsh sunlight, or fungal damage.",

          treatment: [
            "Check the soil moisture",
            "Avoid harsh direct sunlight",
            "Remove severely damaged leaves"
          ],

          image: null
        }
      ],

      additionalCareNotes: [
        "Use a pot with drainage holes.",
        "Do not leave the roots in standing water."
      ],

      updatedAt: now
    },

    $setOnInsert: {
      createdAt: now
    }
  },
  {
    upsert: true
  }
);

print("");
print("PotBuddy database initialization complete.");
print(`Database: ${db.getName()}`);

printjson({
  collections: db.getCollectionNames().sort()
});
