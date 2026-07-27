const express = require("express");

const authenticateToken = require(
  "../middleware/authenticateToken"
);

const {
  getJournalEntries,
  createJournalEntry,
} = require(
  "../controllers/journalController"
);

const router = express.Router();

router.use(authenticateToken);

router.get("/", getJournalEntries);
router.post("/", createJournalEntry);

module.exports = router;
