import mongoose from "mongoose";

export const GLOBAL_FLAGS_ID = "global";

// One document per scope. A string _id makes the global singleton unique by construction.
const featureFlagsSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    flags: { type: Map, of: Boolean, default: () => new Map() },
    version: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

export const FeatureFlags = mongoose.model("FeatureFlags", featureFlagsSchema, "featureflags");

const changeSchema = new mongoose.Schema(
  { key: { type: String, required: true }, previous: { type: Boolean, required: true }, next: { type: Boolean, required: true } },
  { _id: false }
);

const featureFlagAuditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    at: { type: Date, default: Date.now, required: true },
    scope: { type: String, enum: ["global", "kitchen", "user"], required: true },
    targetId: { type: String, default: null },
    versionBefore: { type: Number, required: true },
    versionAfter: { type: Number, required: true },
    changes: { type: [changeSchema], required: true }
  },
  { versionKey: false }
);
featureFlagAuditSchema.index({ at: -1, _id: -1 });
featureFlagAuditSchema.index({ scope: 1, targetId: 1, at: -1 });

const appendOnly = function (next) {
  next(new Error("Feature flag audit entries are append-only"));
};
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "findOneAndDelete", "deleteMany"]) {
  featureFlagAuditSchema.pre(op, appendOnly);
}
featureFlagAuditSchema.pre("deleteOne", { document: true, query: true }, appendOnly);
featureFlagAuditSchema.pre("save", function (next) {
  if (!this.isNew) return next(new Error("Feature flag audit entries are append-only"));
  return next();
});

export const FeatureFlagAudit = mongoose.model("FeatureFlagAudit", featureFlagAuditSchema, "featureflagaudits");
