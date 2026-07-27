const express = require("express");

const {
  getPhoto,
} = require("../controllers/photoController");

const router = express.Router();

/*
 * GET /api/photos/:fileId
 *
 * Streams the image from MongoDB GridFS.
 */
router.get("/:fileId", getPhoto);

module.exports = router;
