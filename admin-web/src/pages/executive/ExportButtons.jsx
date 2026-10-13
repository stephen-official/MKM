import { useState } from "react";
import { Download } from "lucide-react";
import { api } from "../../api.js";
import { Button } from "../../components/ui/index.jsx";
import { useToast } from "../../useToast.js";
import { filenameFromDisposition } from "./format.js";
import { readBlobError, saveBlob } from "./download.js";

const FORMATS = [{ id: "xlsx", label: "Excel", path: "/executive/export.xlsx" }];

export function ExportButtons({ apiQuery, disabled }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(null);

  const run = async (format) => {
    setBusy(format.id);
    try {
      const { godownId, from, to } = apiQuery;
      const res = await api.get(format.path, { params: { godownId, from, to }, responseType: "blob", timeout: 45_000 });
      saveBlob(res.data, filenameFromDisposition(res.headers["content-disposition"]) || `executive-report.${format.id}`);
    } catch (error) {
      const body = await readBlobError(error);
      showToast(body?.message || "The export could not be created. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  return FORMATS.map((format) => (
    <Button key={format.id} variant="ghost" disabled={disabled || busy !== null} onClick={() => run(format)} aria-busy={busy === format.id}>
      <Download size={15} aria-hidden="true" /> {busy === format.id ? "Preparing…" : `Export ${format.label}`}
    </Button>
  ));
}
