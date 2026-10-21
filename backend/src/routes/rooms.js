const express = require("express");
const { auth } = require("../middleware/auth");
const {
  createRoom,
  validateReferenceSolution,
  submitProblem,
  getRoom,
  rateProblem,
} = require("../controllers/roomController");

const router = express.Router();

router.post("/", auth, createRoom);
router.get("/:roomId", auth, getRoom);
router.post("/:roomId/validate", auth, validateReferenceSolution);
router.post("/:roomId/problem", auth, submitProblem);
router.post("/:roomId/rate", auth, rateProblem);

module.exports = router;
