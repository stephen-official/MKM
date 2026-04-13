// import dotenv from "dotenv";

// dotenv.config();

// const toNumber = (value, fallback) => {
//   const parsed = Number(value);
//   return Number.isFinite(parsed) ? parsed : fallback;
// };

// export const env = {
//   port: toNumber(process.env.PORT, 5000),
//   mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventory_db",
//   jwtSecret: process.env.JWT_SECRET || "secret",
//   jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
//   jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
//   jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
//   adminRegistrationLimit: toNumber(process.env.ADMIN_REGISTRATION_LIMIT, 5),
//   userRegistrationLimit: toNumber(process.env.USER_REGISTRATION_LIMIT, 100),
//   corsOrigins: (process.env.CORS_ORIGIN || "").split(",").filter(Boolean)
// };




import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/inventory_db",
  jwtSecret: process.env.JWT_SECRET || "secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  adminRegistrationLimit: toNumber(process.env.ADMIN_REGISTRATION_LIMIT, 5),
  userRegistrationLimit: toNumber(process.env.USER_REGISTRATION_LIMIT, 100),
  corsOrigins: process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(",") 
  : ["http://localhost:5173", "https://mkm-self.vercel.app"],
  // Integrated Email Configuration
  // Matches the lowercase keys in your .env file
// Fix: Check for both Uppercase and Lowercase to be safe
  emailUser: process.env.EMAILUSER || process.env.emailUser,
  emailPass: process.env.EMAILPASS || process.env.emailPass,
  
  // Recommended: Add a frontend URL variable for the reset link
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173"
};