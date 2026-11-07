import { isRejected } from "./orderContributionRules.js";

// A rejected line is never sent or received, even when its share carries a dispatch or receipt time.
// Legacy orders may carry dispatch/receipt timestamps on the whole share instead of each line.
export const isSent = (line, share) => !isRejected(line) && Boolean(line.dispatchedAt || share.dispatchedAt);
export const isReceived = (line, share) => !isRejected(line) && Boolean(line.deliveredAt || share.deliveredAt);
