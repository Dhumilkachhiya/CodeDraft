const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getLeaderboard,
  getCollegeLeaderboard,
  getProfile,
  getProblemsCreated,
  updateAvatar,
  verifyCollege,
} = require("../controllers/userController");
const {
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
  inviteFriendToBattle,
  searchUsers,
} = require("../controllers/friendsController");
const { convertCode, generateSolution } = require("../controllers/aiController");

const router = express.Router();

// Profile & account
router.get("/profile", auth, getProfile);
router.patch("/profile", auth, updateProfile);
router.patch("/avatar", auth, updateAvatar);
router.post("/verify-college", auth, verifyCollege);

// Problems
router.get("/problems-created", auth, getProblemsCreated);

// Leaderboard
router.get("/leaderboard/college", auth, getCollegeLeaderboard);
router.get("/leaderboard", auth, getLeaderboard);

// User search
router.get("/search", auth, searchUsers);

// Friends
router.get("/friends", auth, getFriends);
router.get("/friends/requests", auth, getFriendRequests);
router.post("/friends/request/:username", auth, sendFriendRequest);
router.post("/friends/accept/:username", auth, acceptFriendRequest);
router.post("/friends/reject/:username", auth, rejectFriendRequest);
router.delete("/friends/:username", auth, removeFriend);
router.post("/friends/:username/invite", auth, inviteFriendToBattle);

// AI helpers
router.post("/ai/convert", auth, convertCode);
router.post("/ai/generate-solution", auth, generateSolution);

module.exports = router;
