import { runStockTransaction, stockCommandContext } from "../modules/stock-commands/stockCommandService.js";

export const commandContextFromRequest = (req) => {
  const path = req.originalUrl.split("?")[0].toLowerCase().replace(/\/+$/, "").replace(/^\/api\/operations(?=\/)/, "/api").replace(/^\/api\/orders$/, "/api/consumptions");
  return stockCommandContext({ key: req.get("Idempotency-Key"), actor: req.user, command: `${req.method} ${path}`, input: { body: req.body, query: req.query } });
};

/** HTTP adapter; the feature transaction helper itself has no Express dependency. */
export const stockTransaction = async (req, session, work) => {
  const result = await runStockTransaction({ session, context: commandContextFromRequest(req), work });
  req.stockCommandReplayed = result.replayed;
  return result.value;
};
