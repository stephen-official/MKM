import { ORDERING_SETTINGS_ID, OrderingSettings } from "../models/OrderingSettingsModel.js";
import { DEFAULT_ORDERING_SETTINGS } from "./window.js";

export class OrderingSettingsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const invalid = (message) => new OrderingSettingsError(400, "INVALID_INPUT", message);
const inRange = (value, min, max) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

/** The figures as saved by a super-admin, cleaned; throws INVALID_INPUT for anything that would break ordering. */
export const validateOrderingSettings = (input = {}) => {
  const options = input.neededInOptions;
  if (!Array.isArray(options) || options.length < 1 || options.length > 10) throw invalid("Give between 1 and 10 needed-by options");
  const keys = new Set();
  const neededInOptions = options.map((option) => {
    const key = String(option?.key || "").trim();
    const label = String(option?.label || "").trim();
    if (!/^[a-z0-9]{1,8}$/.test(key) || keys.has(key)) throw invalid("Each needed-by option needs its own short key");
    if (!label || label.length > 30) throw invalid("Each needed-by option needs a label of up to 30 characters");
    if (!inRange(option.hours, 1, 24 * 365)) throw invalid("Each needed-by option must be between 1 hour and 1 year");
    keys.add(key);
    return { key, label, hours: option.hours };
  });
  if (!inRange(input.emergencyHours, 0.25, 24)) throw invalid("The emergency period must be between 15 minutes and 24 hours");
  if (!inRange(input.closeBeforeHours, 0, 24 * 60)) throw invalid("Closing before delivery must be between 0 and 60 days");
  if (!inRange(input.minOpenShare, 0.05, 0.95)) throw invalid("The shortest window must be between 5% and 95% of the time until needed");
  return { neededInOptions, emergencyHours: input.emergencyHours, closeBeforeHours: input.closeBeforeHours, minOpenShare: input.minOpenShare };
};

/** Current figures and their version (0 = defaults, never saved). */
export const readOrderingSettings = async () => {
  const doc = await OrderingSettings.findById(ORDERING_SETTINGS_ID).lean();
  if (!doc) return { settings: DEFAULT_ORDERING_SETTINGS, version: 0 };
  const { neededInOptions, emergencyHours, closeBeforeHours, minOpenShare } = doc;
  return { settings: { neededInOptions, emergencyHours, closeBeforeHours, minOpenShare }, version: doc.version };
};

/** Saves only if nobody else saved since `expectedVersion`; otherwise VERSION_CONFLICT. */
export const writeOrderingSettings = async ({ input, expectedVersion, actor }) => {
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw invalid("expectedVersion must be a non-negative integer");
  const settings = validateOrderingSettings(input);
  const update = { $set: { ...settings, updatedBy: actor }, $inc: { version: 1 } };
  try {
    const doc = expectedVersion === 0
      ? await OrderingSettings.create({ _id: ORDERING_SETTINGS_ID, ...settings, updatedBy: actor, version: 1 })
      : await OrderingSettings.findOneAndUpdate({ _id: ORDERING_SETTINGS_ID, version: expectedVersion }, update, { new: true });
    if (doc) return { settings, version: doc.version };
  } catch (error) {
    if (error?.code !== 11000) throw error; // duplicate _id: someone saved the first version meanwhile
  }
  throw new OrderingSettingsError(409, "VERSION_CONFLICT", "These settings were changed by someone else. Reload and try again.");
};
