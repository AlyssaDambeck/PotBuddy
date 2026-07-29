const express = require("express");
const cors = require("cors");
const helmet = require('helmet');

const authRoutes = require("./routes/authRoutes");
const plantRoutes = require("./routes/plantRoutes");
const speciesRoutes = require("./routes/speciesRoutes");
const journalRoutes = require("./routes/journalRoutes");
const photoRoutes = require("./routes/photoRoutes");
const weatherRoutes = require("./routes/weatherRoutes");

/*const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);*/

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PotBuddy API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/species", speciesRoutes);
app.use("/api/journal-entries", journalRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/weather", weatherRoutes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
