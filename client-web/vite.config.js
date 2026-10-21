import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Label scan (Phase 5): Tesseract.js loads its worker and WebAssembly core by URL. We serve them from our own
// origin under /ocr instead of a CDN, so the scan works on a poor connection and inside the Android app.
// The English language file is committed at public/ocr/eng.traineddata.gz (it is not in any npm package).
const require = createRequire(import.meta.url)
const OCR_FILES = {
  'worker.min.js': require.resolve('tesseract.js/dist/worker.min.js'),
  'tesseract-core-lstm.wasm.js': require.resolve('tesseract.js-core/tesseract-core-lstm.wasm.js'),
  'tesseract-core-simd-lstm.wasm.js': require.resolve('tesseract.js-core/tesseract-core-simd-lstm.wasm.js'),
  'tesseract-core-relaxedsimd-lstm.wasm.js': require.resolve('tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js'),
}
const ocrAssets = () => ({
  name: 'mkm-ocr-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const name = req.url?.startsWith('/ocr/') ? req.url.slice(5).split('?')[0] : ''
      if (!OCR_FILES[name]) return next()
      res.setHeader('Content-Type', 'text/javascript')
      res.end(readFileSync(OCR_FILES[name]))
    })
  },
  generateBundle() {
    for (const [name, path] of Object.entries(OCR_FILES)) this.emitFile({ type: 'asset', fileName: `ocr/${name}`, source: readFileSync(path) })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ocrAssets()],
})
