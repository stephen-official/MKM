export const deleteUsageMessage = (record) => {
  const prompt = `Delete this usage record for ${record.userId?.name || "this user"}?`;
  return record.sourceType === "migrated_daily_usage"
    ? `${prompt} It was moved from the old daily-usage log and never reduced stock, so stock stays the same.`
    : `${prompt} The used quantity will be returned to godown stock.`;
};
