import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../models/User.js";

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select("role godownId active").lean();
    if (!user || !user.active) return res.status(401).json({ message: "Account is inactive" });
    req.user = {
      sub: user._id.toString(),
      role: user.role,
      godownId: user.godownId?.toString() || null
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
  return next();
};
