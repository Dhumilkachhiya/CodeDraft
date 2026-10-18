const jwt = require("jsonwebtoken");
const { validationResult, body } = require("express-validator");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");
const { TOKEN_COOKIE_NAME } = require("../middleware/auth");
const logger = require("../utils/logger");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, errors.array()[0].msg);
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    }).lean();

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      return sendError(res, 409, `An account with this ${field} already exists.`);
    }

    const user = new User({
      username,
      email,
      passwordHash: password,
    });

    await user.save();

    const token = generateToken(user._id);
    res.cookie(TOKEN_COOKIE_NAME, token, COOKIE_OPTIONS);

    logger.info(`New user registered: ${username}`);

    return sendSuccess(res, 201, { user: user.toPublicJSON(), token }, "Registration successful");
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 400, errors.array()[0].msg);
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendError(res, 401, "Invalid email or password.");
    }

    const token = generateToken(user._id);
    res.cookie(TOKEN_COOKIE_NAME, token, COOKIE_OPTIONS);

    logger.info(`User logged in: ${user.username}`);

    return sendSuccess(res, 200, { user: user.toPublicJSON(), token }, "Login successful");
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const TokenBlacklist = require("../models/TokenBlacklist");
    if (req.token) {
      let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d default
      try {
        const decoded = jwt.decode(req.token);
        if (decoded && decoded.exp) {
          expiresAt = new Date(decoded.exp * 1000);
        }
      } catch (_) {}

      await TokenBlacklist.create({
        token: req.token,
        expiresAt,
      });
    }

    res.clearCookie(TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    });

    return sendSuccess(res, 200, null, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return sendError(res, 404, "User not found.");
    }

    const { passwordHash, __v, ...publicUser } = user;

    return sendSuccess(res, 200, { user: publicUser, token: req.token }, "User retrieved successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  registerValidation,
  loginValidation,
};
