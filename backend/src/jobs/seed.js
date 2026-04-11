import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { Godown, StockGroup, StockItem, Unit } from "../models/InventoryModels.js";
import { User } from "../models/User.js";

const run = async () => {
  await connectDB();
  // const g = await Godown.findOneAndUpdate({ name: "Main Godown" }, { name: "Main Godown" }, { upsert: true, new: true });
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
    { email: "admin@example.com" },
    { name: "Admin", email: "admin@example.com", passwordHash: await bcrypt.hash("Admin@123", 10), role: "admin" },
    { upsert: true }
  );
  await User.findOneAndUpdate(
    { email: "user@example.com" },
    { name: "User", email: "user@example.com", passwordHash: await bcrypt.hash("User@123", 10), role: "user", godownId: g._id },
    { upsert: true }
  );
  process.exit(0);
};

run();
