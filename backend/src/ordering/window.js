const HOUR = 3_600_000;

// Defaults until an admin saves their own figures. "Needed by" options are offsets from when the order is opened.
export const DEFAULT_ORDERING_SETTINGS = Object.freeze({
  neededInOptions: Object.freeze([
    { key: "1d", label: "1 day", hours: 24 },
    { key: "3d", label: "3 days", hours: 72 },
    { key: "1w", label: "1 week", hours: 168 },
    { key: "2w", label: "2 weeks", hours: 336 },
    { key: "1m", label: "1 month", hours: 720 },
  ]),
  emergencyHours: 1,
  closeBeforeHours: 72,
  minOpenShare: 0.25,
});

/** When the goods are needed: `now` plus the chosen option, or the emergency period. Null for an unknown option. */
export const neededByFor = ({ neededIn, emergency } = {}, settings, now = new Date()) => {
  const hours = emergency
    ? settings.emergencyHours
    : settings.neededInOptions.find((option) => option.key === neededIn)?.hours;
  return hours > 0 ? new Date(now.getTime() + hours * HOUR) : null;
};

/**
 * When other kitchens can no longer join: open for whichever is longer, the time until needed minus
 * `closeBeforeHours`, or `minOpenShare` of the time until needed.
 */
export const closesAtFor = (openedAt, neededBy, settings) => {
  const lead = neededBy.getTime() - openedAt.getTime();
  const open = Math.max(lead - settings.closeBeforeHours * HOUR, lead * settings.minOpenShare);
  return new Date(openedAt.getTime() + open);
};
