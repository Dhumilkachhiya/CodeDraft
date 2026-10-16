require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const configureSockets = require("./config/socket");
const initExpiryCron = require("./config/expiryCron");
const { closeRedis, getRedisClient } = require("./config/redis");
const { closeExecutionQueue } = require("./queues/executionQueue");
const {
  isWorkerRunning,
  startWorker,
  stopWorker,
} = require("./workers/executionWorker");

const connectDB = require("./config/db");
const validateEnv = require("./config/validateEnv");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimit");
const logger = require("./utils/logger");
const { sendSuccess } = require("./utils/response");
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const userRoutes = require("./routes/users");

const matchRoutes = require("./routes/matches");
const profileRoutes = require("./routes/profiles");
const notificationRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");

validateEnv();

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

app.use(helmet());

// Support comma-separated CLIENT_URL for multiple allowed origins
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

if (process.env.NODE_ENV !== "production") {
  app.use(
    morgan("dev", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

app.get("/api/health", (req, res) => {
  const redis = getRedisClient();
  return sendSuccess(
    res,
    200,
    {
      status: "healthy",
      uptime: process.uptime(),
      redis: redis?.isReady ? "connected" : process.env.REDIS_URL ? "disconnected" : "disabled",
      executionWorker: process.env.EXECUTION_WORKER_ENABLED === "true"
        ? isWorkerRunning() ? "running" : "stopped"
        : "external-or-disabled",
    },
    "Server is running"
  );
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/users", userRoutes);

app.use("/api/matches", matchRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10);

const startServer = async () => {
  try {
    await connectDB();
    const io = await configureSockets(server);
    app.set("io", io);
    initExpiryCron(io);

    if (process.env.EXECUTION_WORKER_ENABLED === "true") {
      await startWorker({ connectDatabase: false });
    }

    server.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async () => {
  await stopWorker();
  await closeExecutionQueue();
  await closeRedis();
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startServer();

module.exports = app;
