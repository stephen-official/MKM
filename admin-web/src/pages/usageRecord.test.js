import { describe, expect, it } from "vitest";
import { deleteUsageMessage } from "./usageRecord.js";

describe("deleteUsageMessage", () => {
  it("promises returned stock for usage that deducted it", () => {
    expect(deleteUsageMessage({ userId: { name: "Asha" }, sourceType: "direct" }))
      .toBe("Delete this usage record for Asha? The used quantity will be returned to godown stock.");
  });

  it("says stock stays the same for migrated daily usage, which never deducted it", () => {
    expect(deleteUsageMessage({ sourceType: "migrated_daily_usage" }))
      .toBe("Delete this usage record for this user? It was moved from the old daily-usage log and never reduced stock, so stock stays the same.");
  });
});
