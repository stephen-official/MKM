import { verifyAccessToken } from "../utils/tokens.js";

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  return next();
};
