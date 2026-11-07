import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { Godown, StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { User } from "../models/User.js";

// Local test accounts only, all with one password. It is written straight to the database, so the app's
// 8-character minimum (checked only when a password is set through the API) does not apply here.
const DEV_PASSWORD = "KMS2026";

const run = async () => {
  await connectDB();
  // Change this line in your run.js file
const g = await Godown.findOneAndUpdate(
  { name: "Main Godown" }, 
  { name: "Main Godown", active: true }, // Add active: true here
  { upsert: true, new: true }
);
 
 
 
 
 
  const sg = await StockGroup.findOneAndUpdate({ name: "Groceries" }, { name: "Groceries" }, { upsert: true, new: true });
  const unit = await Unit.findOneAndUpdate(
    { name: "Kilogram" },
    { name: "Kilogram", symbol: "kg", stockGroupId: sg._id, subUnits: [{ name: "gm", factorToBase: 0.001 }] },
    { upsert: true, new: true }
  );
  await StockItem.findOneAndUpdate({ name: "Rice" }, { name: "Rice", stockGroupId: sg._id, unitId: unit._id }, { upsert: true });
  await User.findOneAndUpdate(
    { email: "admin.dev@kms.local" },
    { name: "Admin", email: "admin.dev@kms.local", passwordHash: await bcrypt.hash(DEV_PASSWORD, 10), role: "admin" },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: "main-godown.dev@kms.local" },
    { name: "Main Godown User", email: "main-godown.dev@kms.local", passwordHash: await bcrypt.hash(DEV_PASSWORD, 10), role: "user", godownId: g._id },
    { upsert: true }
  );
  process.exit(0);
};

run();
