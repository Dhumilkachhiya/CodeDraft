const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response");

const TOKEN_COOKIE_NAME = "codedraft_token";

const auth = async (req, res, next) => {
  try {
    // Check Authorization header first (for incognito/cross-origin), then fall back to cookie
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    if (!token) {
      token = req.cookies[TOKEN_COOKIE_NAME];
    }

    if (!token) {
      return sendError(res, 401, "Authentication required. Please log in.");
    }

    const TokenBlacklist = require("../models/TokenBlacklist");
    const isBlacklisted = await TokenBlacklist.findOne({ token }).lean();
    if (isBlacklisted) {
      return sendError(res, 401, "Session invalidated. Please log in again.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Session expired. Please log in again.");
    }
    return sendError(res, 401, "Invalid authentication token.");
  }
};

module.exports = { auth, TOKEN_COOKIE_NAME };

