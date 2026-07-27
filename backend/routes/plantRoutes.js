const express = require("express");

const authenticateToken = require(
  "../middleware/authenticateToken",
);

const {
  getAllPlants,
  getPlantById,
  createPlant,
  updatePlant,
  deletePlant,
  waterPlant,
} = require("../controllers/plantController");

const {
  uploadPhotoMiddleware,
  uploadPlantPhoto,
} = require("../controllers/photoController");

const router = express.Router();

/*
 * Every plant route requires the user's
 * Bearer authentication token.
 */
router.use(authenticateToken);

/*
 * GET /api/plants
 * Return all plants belonging to the
 * logged-in user.
 */
router.get("/", getAllPlants);

/*
 * POST /api/plants
 * Add a plant for the logged-in user.
 */
router.post("/", createPlant);

/*
 * POST /api/plants/:id/photos
 *
 * Reads the multipart field named "photo",
 * saves the image to GridFS, and updates
 * the plant's picture reference.
 */
router.post(
  "/:id/photos",
  uploadPhotoMiddleware,
  uploadPlantPhoto,
);

/*
 * Compatibility version of the photo
 * upload route.
 */
router.post(
  "/:id/picture",
  uploadPhotoMiddleware,
  uploadPlantPhoto,
);

/*
 * PATCH /api/plants/:id/water
 * Record that the plant was watered.
 */
router.patch(
  "/:id/water",
  waterPlant,
);

/*
 * Keep the older POST watering route
 * working as a compatibility fallback.
 */
router.post(
  "/:id/water",
  waterPlant,
);

/*
 * GET /api/plants/:id
 * Return one plant owned by the
 * logged-in user.
 */
router.get(
  "/:id",
  getPlantById,
);

/*
 * PATCH /api/plants/:id
 * Update one plant owned by the
 * logged-in user.
 */
router.patch(
  "/:id",
  updatePlant,
);

/*
 * DELETE /api/plants/:id
 * Delete one plant owned by the
 * logged-in user.
 */
router.delete(
  "/:id",
  deletePlant,
);

module.exports = router;
