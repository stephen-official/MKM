import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet = null;

/** Starts a single-node replica set (transactions need one) and connects mongoose. */
export const startDb = async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await mongoose.connect(replSet.getUri());
};

/** Empties every collection but keeps indexes, so unique constraints still apply. */
export const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

/** Builds every registered model's indexes; call after importing the models under test. */
export const syncAllIndexes = async () => {
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
};

export const stopDb = async () => {
  await mongoose.disconnect();
  await replSet?.stop();
  replSet = null;
};
