const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const plantRoutes = require("./routes/plantRoutes");
const speciesRoutes = require("./routes/speciesRoutes");

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;