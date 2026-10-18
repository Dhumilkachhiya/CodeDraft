const express = require("express");
const { auth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const {
  register,
  login,
  logout,
  getMe,
  registerValidation,
  loginValidation,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);
router.post("/logout", auth, logout);
router.get("/me", auth, getMe);

module.exports = router;
