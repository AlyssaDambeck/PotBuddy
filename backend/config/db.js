const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

async function connectDB() {
    try {
        await client.connect();

        console.log("✅ Connected to MongoDB Atlas!");

        return client;
    }
    catch (err) {
        console.error("❌ MongoDB Connection Failed");
        console.error(err);

        process.exit(1);
    }
}

module.exports = { connectDB, client };