import mongoose from "mongoose";
import multer from "multer";
import { CollaborativePurchaseOrder } from "../../models/CollaborativePurchaseOrderModel.js";
import { fail } from "../../shared/httpErrors.js";
import { isAudioType, isPhotoType, storePhoto, storeVoiceNote } from "../../stock/photoStorage.js";

const PHOTO_LIMIT_MB = 8;
const VOICE_LIMIT_MB = 5;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_LIMIT_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => (isPhotoType(file.mimetype) ? done(null, true) : done(fail(400, "Photos must be JPEG, PNG or WebP"))),
}).single("photo");

const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VOICE_LIMIT_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => (isAudioType(file.mimetype) ? done(null, true) : done(fail(400, "Voice notes must be a recording (webm, m4a, mp3, ogg or wav)"))),
}).single("audio");

export const parseOrderPhoto = photoUpload;
export const parseOrderVoiceNote = voiceUpload;
export const ORDER_PHOTO_LIMIT_MB = PHOTO_LIMIT_MB;
export const ORDER_VOICE_LIMIT_MB = VOICE_LIMIT_MB;

const assertKitchenOnOrder = async ({ orderId, godownId }) => {
  if (!mongoose.isValidObjectId(orderId)) throw fail(404, "Collaborative purchase order not found");
  const order = await CollaborativePurchaseOrder.findById(orderId).select("contributions.godownId").lean();
  if (!order) throw fail(404, "Collaborative purchase order not found");
  if (!order.contributions.some((entry) => String(entry.godownId) === String(godownId))) {
    throw fail(404, "Your kitchen is not on this order");
  }
};

export const uploadOrderPhoto = async ({ orderId, godownId, file, baseUrl }) => {
  await assertKitchenOnOrder({ orderId, godownId });
  if (!file) throw fail(400, "Choose a photo to upload", "PHOTO_REQUIRED");
  return storePhoto({ buffer: file.buffer, mimetype: file.mimetype, baseUrl });
};

export const uploadOrderVoiceNote = async ({ orderId, godownId, file, baseUrl }) => {
  await assertKitchenOnOrder({ orderId, godownId });
  if (!file) throw fail(400, "Record a voice note first", "PHOTO_REQUIRED");
  return storeVoiceNote({ buffer: file.buffer, mimetype: file.mimetype, baseUrl });
};
