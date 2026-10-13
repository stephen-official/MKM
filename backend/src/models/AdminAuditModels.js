import mongoose from "mongoose";

const userAdminAuditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorEmail: { type: String, default: "" },
    at: { type: Date, default: Date.now, required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["create", "update", "send-reset"], required: true },
    before: { type: Object, default: null },
    after: { type: Object, default: null }
  },
  { versionKey: false }
);
userAdminAuditSchema.index({ at: -1, _id: -1 });

const appendOnly = function (next) { next(new Error("User audit entries are append-only")); };
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "findOneAndReplace", "replaceOne", "findOneAndDelete", "deleteMany"]) userAdminAuditSchema.pre(op, appendOnly);
userAdminAuditSchema.pre("deleteOne", { document: true, query: true }, appendOnly);
userAdminAuditSchema.pre("save", function (next) { return this.isNew ? next() : next(new Error("User audit entries are append-only")); });

export const UserAdminAudit = mongoose.model("UserAdminAudit", userAdminAuditSchema, "useradminaudits");
