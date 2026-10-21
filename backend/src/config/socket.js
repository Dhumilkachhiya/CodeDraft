const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const logger = require("../utils/logger");
const { createAdapter } = require("@socket.io/redis-adapter");
const {
  connectRedis,
  getRedisAdapterClients,
  isRedisEnabled,
} = require("./redis");

const registerMatchHandlers = require("../sockets/matchHandler");
const {
  SOCKET_CONNECTION_TTL_SECONDS,
  registerSocketConnection,
  removeSocketConnection,
} = require("../services/socketConnectionService");

const configureSockets = async (server) => {
  // Support comma-separated CLIENT_URL for multiple allowed origins
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
    : [];

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
    },
  });

  if (isRedisEnabled()) {
    await connectRedis();
    const { pubClient, subClient } = getRedisAdapterClients();
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use(async (socket, next) => {
    let registered = false;
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        token = socket.handshake.query?.token;
      }

      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        if (cookieHeader) {
          const cookies = cookie.parse(cookieHeader);
          token = cookies.codedraft_token;
        }
      }

      if (!token) {
        return next(new Error("Authentication error: Token not found"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;

      const accepted = await registerSocketConnection(socket.userId, socket.id);
      if (!accepted) {
        return next(new Error("Maximum active connections reached"));
      }

      registered = true;
      next();
    } catch (error) {
      if (registered) {
        await removeSocketConnection(socket.userId, socket.id).catch(() => {});
      }
      logger.error(`Socket connection rejected: ${error.message}`);
      next(
        new Error(
          error.name === "JsonWebTokenError" || error.name === "TokenExpiredError"
            ? "Authentication error: Invalid token"
            : "Socket connection could not be established"
        )
      );
    }
  });

  io.on("connection", (socket) => {
    logger.info(`New authenticated socket connection: ${socket.id} (User: ${socket.userId})`);
    
    // Join a room unique to the user so we can emit targeted notifications/events to all of their active connections
    socket.join(socket.userId.toString());

    registerMatchHandlers(io, socket);

    const refreshInterval = setInterval(async () => {
      try {
        const accepted = await registerSocketConnection(socket.userId, socket.id);
        if (!accepted) socket.disconnect(true);
      } catch (error) {
        logger.error(`Socket connection refresh failed: ${error.message}`);
      }
    }, Math.max(10000, Math.floor((SOCKET_CONNECTION_TTL_SECONDS * 1000) / 3)));
    refreshInterval.unref?.();

    socket.on("disconnect", async () => {
      clearInterval(refreshInterval);
      try {
        await removeSocketConnection(socket.userId, socket.id);
      } catch (error) {
        logger.error(`Socket connection cleanup failed: ${error.message}`);
      }
      logger.info(`Socket disconnected: ${socket.id} (User: ${socket.userId})`);
    });
  });

  return io;
};

module.exports = configureSockets;
