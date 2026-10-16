const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }

  mongoose.connection.on("error", (error) => {
    logger.error(`MongoDB runtime error: ${error.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    logger.info("MongoDB disconnected");
  });
};

module.exports = connectDB;
