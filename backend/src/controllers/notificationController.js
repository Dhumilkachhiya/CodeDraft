const Notification = require("../models/Notification");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const notifications = await Notification.find({ recipientId: userId })
      .populate("senderId", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const unreadCount = await Notification.countDocuments({ recipientId: userId, read: false });

    return sendSuccess(
      res,
      200,
      { notifications, unreadCount },
      "Notifications retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error in getNotifications: ${error.message}`);
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    const userId = req.userId;

    await Notification.updateMany({ recipientId: userId, read: false }, { $set: { read: true } });

    return sendSuccess(res, 200, {}, "All notifications marked as read");
  } catch (error) {
    logger.error(`Error in markAllRead: ${error.message}`);
    next(error);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { notifId } = req.params;

    const notif = await Notification.findOneAndUpdate(
      { _id: notifId, recipientId: userId },
      { $set: { read: true } },
      { new: true }
    );

    if (!notif) {
      return sendError(res, 404, "Notification not found");
    }

    return sendSuccess(res, 200, { notif }, "Notification marked as read");
  } catch (error) {
    logger.error(`Error in markOneRead: ${error.message}`);
    next(error);
  }
};

module.exports = { getNotifications, markAllRead, markOneRead };
