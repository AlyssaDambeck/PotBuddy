//const dns = require("node:dns");
const { MongoClient } = require("mongodb");
require("dotenv").config();

//dns.setServers(["8.8.8.8", "1.1.1.1"]);

const uri = process.env.MONGODB_URI;

// for debugging
if (!uri) {
    throw new Error("MONGODB_URI is missing from the .env file.");
}

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
