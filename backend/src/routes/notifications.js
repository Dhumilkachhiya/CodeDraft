const express = require("express");
const { auth } = require("../middleware/auth");
const { getNotifications, markAllRead, markOneRead } = require("../controllers/notificationController");

const router = express.Router();

router.get("/", auth, getNotifications);
router.post("/read-all", auth, markAllRead);
router.patch("/:notifId/read", auth, markOneRead);

module.exports = router;
