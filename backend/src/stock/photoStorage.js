import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

// Where kitchen receiving photos go: Cloudinary when its keys are set (production, on Render's throwaway disk),
// otherwise the backend's own uploads folder (local development and tests).

const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Reads CLOUDINARY_URL or the three CLOUDINARY_* keys; true when Cloudinary can be used. */
export const cloudinaryConfigured = () => {
  const { CLOUDINARY_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
    return true;
  }
  if (CLOUDINARY_URL) { cloudinary.config(true); return Boolean(cloudinary.config().api_key); }
  return false;
};

export const isPhotoType = (mimetype) => Boolean(EXT[mimetype]);

const toCloudinary = (buffer, folder) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit" }] },
    (error, result) => (error ? reject(error) : resolve(result.secure_url)),
  );
  stream.end(buffer);
});

const toDisk = async (buffer, mimetype, folder, baseUrl) => {
  const dir = path.join(uploadsDir, folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${EXT[mimetype]}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return `${baseUrl}/uploads/${folder}/${name}`;
};

/** Stores one image and returns its public URL. `baseUrl` (scheme + host of this API) is used for the disk fallback. */
export const storePhoto = async ({ buffer, mimetype, folder = "receipts", baseUrl }) => {
  if (!isPhotoType(mimetype)) throw Object.assign(new Error("Photos must be JPEG, PNG or WebP"), { status: 400, code: "INVALID_INPUT" });
  return cloudinaryConfigured() ? toCloudinary(buffer, `mkm/${folder}`) : toDisk(buffer, mimetype, folder, baseUrl);
};
