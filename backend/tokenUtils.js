const { randomBytes, createHash } = require("crypto");

function generateToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

module.exports = { generateToken, hashToken };
