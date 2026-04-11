import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, godownId: user.godownId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);
export const createResetToken = () => crypto.randomBytes(24).toString("hex");
