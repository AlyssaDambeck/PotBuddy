const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

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