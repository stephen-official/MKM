// Reads the printed text off a label photo on the phone itself (Tesseract.js in a web worker). Browser-only.
// Everything it needs is served from our own /ocr folder (see vite.config.js), nothing comes from a CDN.
// Callers must treat any failure as "no text": the receive form is never changed by a failed read.

const OCR_PATH = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/ocr`;
const READ_TIMEOUT_MS = 30_000;
let workerPromise = null;

/** Web workers and WebAssembly are needed; every Android WebView and desktop browser we target has both. */
export const canScanLabels = () => typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly === "object";

const startWorker = async () => {
  const { createWorker } = (await import("tesseract.js/dist/tesseract.esm.min.js")).default; // that build has only a default export
  return createWorker("eng", 1, { workerPath: `${OCR_PATH}/worker.min.js`, corePath: OCR_PATH, langPath: OCR_PATH });
};

/** Throws away the current worker so the next read starts a fresh one. */
export const stopLabelScanner = async () => {
  const pending = workerPromise;
  workerPromise = null;
  try { (await pending)?.terminate(); } catch { /* it had already failed */ }
};

/** The text on the photo, or throws. One worker is kept for the screen's lifetime; a stuck read is abandoned after 30 s. */
export const readLabelText = async (blob) => {
  if (!canScanLabels()) throw new Error("Label scan is not available in this browser");
  workerPromise ||= startWorker().catch((error) => { workerPromise = null; throw error; });
  const worker = await workerPromise;
  let timer;
  try {
    const { data } = await Promise.race([
      worker.recognize(blob),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Label scan timed out")), READ_TIMEOUT_MS); }),
    ]);
    return data?.text || "";
  } catch (error) {
    await stopLabelScanner();
    throw error;
  } finally {
    clearTimeout(timer);
  }
};
