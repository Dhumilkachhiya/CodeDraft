const logger = require("../utils/logger");
const { sendError } = require("../utils/response");

const errorHandler = (err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  if (err.code === 11000) {
    const keys = Object.keys(err.keyValue || {});
    const duplicateField = keys[0] || "field";
    const capitalizedField = duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1);
    return sendError(res, 409, `${capitalizedField} is already registered. Please choose another.`);
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again later."
      : err.message || "Internal Server Error";

  return sendError(res, statusCode, message);
};

module.exports = errorHandler;
