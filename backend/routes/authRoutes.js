const express = require("express");

const {
  register,
  login,
  verifyEmail,
  resendVerification,
  getCurrentUser,
} = require("../controllers/authController");

const authenticateToken =
  require("../middleware/authenticateToken");

const {
  googleLogin,
} = require("../controllers/googleAuthController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/google", googleLogin);
router.get("/me", authenticateToken, getCurrentUser);
module.exports = router;
