import { isRejected } from "./orderContributionRules.js";

// Legacy orders may carry dispatch/receipt timestamps on the whole share instead of each line.
export const isSent = (line, share) => !isRejected(line) && Boolean(line.dispatchedAt || share.dispatchedAt);
export const isReceived = (line, share) => !isRejected(line) && Boolean(line.deliveredAt || share.deliveredAt);
