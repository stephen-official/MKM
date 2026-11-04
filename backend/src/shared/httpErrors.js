const DEFAULT_CODES = Object.freeze({
  400: "INVALID_INPUT",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
});

/** A client-safe operational error that can cross service/controller boundaries. */
export class AppError extends Error {
  constructor(status, message, code = DEFAULT_CODES[status], details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const fail = (status, message, code, details) => new AppError(status, message, code, details);

/** Maps known operational/database errors to the stable JSON envelope used by the API. */
export const errorResponse = (error) => {
  if (error?.name === "VersionError") {
    return {
      status: 409,
      body: { code: "VERSION_CONFLICT", message: "This record was changed by someone else. Reload and try again." },
    };
  }
  const status = error?.status || (error?.name === "CastError" ? 404 : 500);
  const body = {
    code: error?.code || DEFAULT_CODES[status] || "SERVER_ERROR",
    message: status === 500 ? "Internal Server Error" : error.message,
  };
  if (error?.details !== undefined && status < 500) body.details = error.details;
  return { status, body };
};

/** Temporary adapter for route modules; controllers can later throw into the global error middleware. */
export const sendError = (res, error, overrides = {}) => {
  const response = errorResponse(error);
  if (overrides.versionConflictMessage && error?.name === "VersionError") {
    response.body.message = overrides.versionConflictMessage;
  }
  return res.status(response.status).json(response.body);
};

/** For new controllers: forward rejected promises to Express error middleware. */
export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
