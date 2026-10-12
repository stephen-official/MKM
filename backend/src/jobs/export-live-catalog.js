// READ-ONLY: copies godowns, stock groups, units and stock items from the DB in MONGODB_URI
// to ~/mkm-local/live-catalog.json. Only calls find(); never writes. No users or transactions.
import "dotenv/config";
import fs from "fs";
import mongoose from "mongoose";

const COLLECTIONS = ["godowns", "stockgroups", "units", "stockitems"];
await mongoose.connect(process.env.MONGODB_URI, { readPreference: "secondaryPreferred" });
const out = {};
for (const c of COLLECTIONS) out[c] = await mongoose.connection.db.collection(c).find({}).toArray();
fs.writeFileSync(`${process.env.HOME}/mkm-local/live-catalog.json`, JSON.stringify(out), { mode: 0o600 });
for (const c of COLLECTIONS) console.log(c, out[c].length);
await mongoose.disconnect();
