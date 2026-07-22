const express = require("express");
const cors = require("cors");

const dns = require("node:dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const { connectDB } = require("./config/db");
const plantRoutes = require("./routes/plantRoutes");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/plants", plantRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "PotBuddy API is running!"
    });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});