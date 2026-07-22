const jwt = require("jsonwebtoken");

function generateToken(userId){
  if(!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  )

module.exports = generateToken;

