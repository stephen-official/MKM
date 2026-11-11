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
export const errorResponse = (error, overrides = {}) => {
  if (!error?.stockCommandError && overrides.formatError) return overrides.formatError(error);
  if (error?.name === "VersionError") {
    return {
      status: 409,
      body: { code: "VERSION_CONFLICT", message: overrides.versionConflictMessage || "This record was changed by someone else. Reload and try again." },
    };
  }
  const status = error?.status || (error?.name === "CastError" ? 404 : 500);
  const body = {
    code: error?.code || DEFAULT_CODES[status] || "SERVER_ERROR",
    message: status === 500 ? (overrides.serverErrorMessage || "Internal Server Error") : error.message,
  };
  if (error?.details !== undefined && status < 500) body.details = error.details;
  return { status, body };
};

/** Temporary adapter for route modules; controllers can later throw into the global error middleware. */
export const sendError = (res, error, overrides = {}) => {
  const response = errorResponse(error, overrides);
  return res.status(response.status).json(response.body);
};

/** For new controllers: forward rejected promises to Express error middleware. */
export const forwardError = (next, error, overrides = {}) => {
  if (!(error instanceof Error)) error = Object.assign(new Error(error?.message || String(error)), error && typeof error === "object" ? error : {});
  error.httpErrorOverrides = overrides;
  return next(error);
};

export const asyncRoute = (handler, overrides = {}) => (req, res, next) => Promise.resolve().then(() => handler(req, res, next))
  .catch((error) => forwardError(next, error, overrides));

/** Compatibility policies keep established endpoint envelopes while errors flow to the global handler. */
export const legacyErrorPolicy = ({ status = 500, respectStatus = false, field = "error", message, fallback, includeError = false, code, text = false, publicMessageOnly = false, unknownMessage, specials = [] } = {}) => ({
  formatError: (error) => {
    const special = specials.find((rule) => rule.matches(error));
    if (special) return { status: special.status, body: special.body };
    const resultStatus = (respectStatus && error.status) || status;
    if (publicMessageOnly && error.status) return { status: error.status, body: { message: error.message } };
    if (unknownMessage && !error.status) return { status: 500, body: { message: unknownMessage } };
    return {
      status: resultStatus,
      ...(text ? { text: true, body: message } : {
        body: { ...(code ? { code } : {}), [field]: message ?? (fallback === undefined ? error.message : error.message || fallback), ...(includeError ? { error: error.message } : {}) },
      }),
    };
  },
});

export const typedErrorPolicy = ({ isPublic = (error) => Boolean(error.status), fallbackCode = "SERVER_ERROR", fallbackMessage = "Internal Server Error", useErrorCode = false, useErrorMessage = false, includeFallbackCode = true, publicCodeFallback, flattenDetails = false, extraFields = [], specials = [], fallbackPolicy } = {}) => ({
  formatError: (error) => {
    const special = specials.find((rule) => rule.matches(error));
    if (special) return {
      status: special.status,
      body: { code: special.code || error.code, message: special.message || error.message, ...Object.fromEntries((special.fields || []).map((key) => [key, error[key]])) },
    };
    if (isPublic(error)) return {
      status: error.status,
      body: {
        code: publicCodeFallback === null ? error.code : (error.code || publicCodeFallback || DEFAULT_CODES[error.status]), message: error.message,
        ...(flattenDetails ? error.details : {}),
        ...Object.fromEntries(extraFields.map((key) => [key, error[key]])),
      },
    };
    if (fallbackPolicy) return fallbackPolicy.formatError(error);
    return { status: 500, body: { ...(includeFallbackCode ? { code: (useErrorCode && error.code) || fallbackCode } : {}), message: useErrorMessage ? error.message : fallbackMessage } };
  },
});
