import { TICKET_REASONS } from "../../models/DeliveryTicketModel.js";
import { isIsoDate, startOfBusinessDay } from "../../executive/params.js";
import { fail } from "../../shared/httpErrors.js";

const STORAGE = new Set(["room", "fridge", "freezer"]);
const FILE_URL = /^(https?:\/\/|\/uploads\/)\S{1,500}$/;
const text = (value, max, label) => {
  const result = String(value || "").trim();
  if (result.length > max) throw fail(400, `${label} must be ${max} characters or fewer`);
  return result;
};
const receiptDate = (value, label) => {
  if (value === undefined || value === null || value === "") return null;
  if (!isIsoDate(String(value))) throw fail(400, `${label} must be a date like 2026-12-31`);
  return startOfBusinessDay(String(value));
};

export const receiptDetails = (input, product, today, { labelRequired = true, expiryRequired = product?.expiryRequired !== false } = {}) => {
  const name = product?.name || "This item";
  const photos = { goods: String(input?.photos?.goods || "").trim(), label: String(input?.photos?.label || "").trim() };
  if (!FILE_URL.test(photos.goods)) throw fail(400, `${name}: take a photo of the goods`, "PHOTO_REQUIRED");
  if (labelRequired && !FILE_URL.test(photos.label)) throw fail(400, `${name}: take a photo of the brand label`, "PHOTO_REQUIRED");
  if (!labelRequired && photos.label && !FILE_URL.test(photos.label)) throw fail(400, `${name}: the label photo is not valid`, "PHOTO_REQUIRED");
  const expiryDate = receiptDate(input?.expiryDate, `${name}: expiry date`);
  if (!expiryDate && expiryRequired) throw fail(400, `${name}: enter the expiry date`, "EXPIRY_REQUIRED");
  if (expiryDate && String(input.expiryDate) < today) {
    throw fail(400, `${name}: the expiry date has already passed. Do not accept it; call the central store.`, "EXPIRED_GOODS");
  }
  const mfgDate = receiptDate(input?.mfgDate, `${name}: manufacture date`);
  if (mfgDate && String(input.mfgDate) > today) throw fail(400, `${name}: the manufacture date cannot be in the future`);
  const storage = input?.storage === undefined || input?.storage === null || input?.storage === "" ? null : String(input.storage);
  if (storage !== null && !STORAGE.has(storage)) throw fail(400, `${name}: storage must be room, fridge or freezer`);
  return { photos, expiryDate, mfgDate, storage, lotNumber: text(input?.lotNumber, 60, `${name}: batch number`), notes: text(input?.notes, 500, `${name}: notes`) };
};

export const supplierSnapshotFor = (order, stockItemId) => {
  const override = (order.supplierByProduct || []).find((entry) => String(entry.stockItemId) === String(stockItemId))?.supplierId;
  const supplier = override && typeof override === "object" ? override : order.supplierId;
  return { supplierName: supplier?.name || "", supplierFssaiLicence: supplier?.fssaiLicence || "" };
};

export const problemDetails = (input, line, product, today) => {
  const name = product?.name || "This item";
  const problem = input?.problem || {};
  const reason = String(problem.reason || "");
  if (!TICKET_REASONS.includes(reason)) throw fail(400, `${name}: choose what went wrong (short, excess, damaged, wrong item or expired)`);
  const ordered = Number(line.qtyBaseUnit);
  const received = problem.receivedQtyBaseUnit === undefined || problem.receivedQtyBaseUnit === "" ? 0 : Number(problem.receivedQtyBaseUnit);
  if (!Number.isFinite(received) || received < 0) throw fail(400, `${name}: enter how much usable stock arrived`);
  if (reason === "wrong_item" && received !== 0) throw fail(400, `${name}: a wrong item cannot be added as ${name}; enter 0 usable`);
  if (reason === "short" && received >= ordered) throw fail(400, `${name}: a short delivery means less than ${ordered} arrived`);
  if (reason === "excess" && received <= ordered) throw fail(400, `${name}: an excess delivery means more than ${ordered} arrived`);
  const voiceNoteUrl = String(problem.voiceNoteUrl || "").trim();
  if (voiceNoteUrl && !FILE_URL.test(voiceNoteUrl)) throw fail(400, `${name}: the voice note is not valid`);
  const details = receiptDetails(input, product, today, { labelRequired: false, expiryRequired: received > 0 && product?.expiryRequired !== false });
  return { reason, receivedQtyBaseUnit: received, note: text(problem.note, 500, `${name}: note`), voiceNoteUrl, details };
};
