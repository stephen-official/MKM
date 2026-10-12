import bcrypt from "bcryptjs";
import { User } from "../../models/User.js";
import { Godown } from "../../models/InventoryModels.js";
import { signAccessToken, signRefreshToken } from "../../utils/tokens.js";

let counter = 0;

export const createGodown = (name, { active = true } = {}) => Godown.create({ name, active });

/** Creates a user with a low bcrypt cost (fast) and returns valid tokens for it. */
export const createUser = async ({
  role = "admin",
  godownId = null,
  email,
  password = "Passw0rd!",
  active = true,
  name
} = {}) => {
  counter += 1;
  const user = await User.create({
    name: name || `${role} ${counter}`,
    email: email || `${role}.${counter}.${Date.now()}@test.local`,
    passwordHash: await bcrypt.hash(password, 4),
    role,
    godownId,
    active
  });
  const token = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = refreshToken;
  await user.save();
  return { user, token, refreshToken, password };
};
