import dotenv from "dotenv";

// Tests use deterministic defaults and explicit fixtures. Loading the normal
// development .env here would expose live email/upload credentials to tests
// and can make the same suite behave differently on each developer machine.
if (process.env.NODE_ENV !== "test") dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const assertProductionSecrets = ({ nodeEnv, jwtSecret, jwtRefreshSecret, tlsRejectUnauthorized }) => {
  if (nodeEnv !== "production") return;

  const missing = [];
  if (!jwtSecret) missing.push("JWT_SECRET");
  if (!jwtRefreshSecret) missing.push("JWT_REFRESH_SECRET");
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }
  if (String(tlsRejectUnauthorized ?? "") === "0") {
    throw new Error("Production cannot disable TLS certificate verification (NODE_TLS_REJECT_UNAUTHORIZED=0)");
  }
};

assertProductionSecrets({
  nodeEnv: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
});

export const env = {
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventory_db",
  jwtSecret: process.env.JWT_SECRET || "secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  adminRegistrationLimit: toNumber(process.env.ADMIN_REGISTRATION_LIMIT, 5),
  userRegistrationLimit: toNumber(process.env.USER_REGISTRATION_LIMIT, 100),
  corsOrigins: (process.env.CORS_ORIGIN || "").split(",").filter(Boolean),
  
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
  
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  reportSchedulerEnabled: process.env.REPORT_SCHEDULER_ENABLED === "true"
};
