const bcrypt = require("bcrypt");
const { client } = require("../config/db");
const generateToken = require("../utils/generateToken");

const usersCollection = () => client.db().collection("users");

function safeUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    emailVerified: user.emailVerified,
    featuredPlantId: user.featuredPlantId ?? null,
    createdAt: user.createdAt,
  };
}

async function register(req, res) {
  try {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(422).json({
        success: false,
        message: "Username must be between 3 and 30 characters",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(422).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    const users = usersCollection();

    const existingUser = await users.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or username is already registered",
      });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 12);

    const userDocument = {
      username,
      email,
      passwordHash,
      googleId: null,
      authProvider: "local",
      emailVerified: false,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      featuredPlantId: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(userDocument);

    const createdUser = {
      ...userDocument,
      _id: result.insertedId,
    };

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: safeUser(createdUser),
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register user",
    });
  }
}

async function login(req, res) {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await usersCollection().findOne({ email });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: safeUser(user),
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}

module.exports = {
  register,
  login,
};
