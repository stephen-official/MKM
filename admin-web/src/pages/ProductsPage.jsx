import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, Download, Edit3, FileSpreadsheet, FileText, Loader2, Package, Plus, Search, Upload, X } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { downloadName, formatDateTime } from "../businessTime.js";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";
import { Badge, Banner, Button, EmptyState, ErrorState, Field, Modal, PageHeader, Select } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { createRequestTracker } from "./executive/requestTracker.js";
import { ProductForm } from "./products/ProductForm.jsx";
import { emptyProductForm, formFromProduct, formatPrice, missingText, packSummary, payloadFromForm } from "./products/productForm.js";
import { foodSafetySummary } from "./products/foodSafety.js";
import "./products/products.css";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "incomplete", label: "Incomplete" },
  { value: "fssai", label: "FSSAI details" },
  { value: "nophoto", label: "No photo" },
  { value: "archived", label: "Archived" }
];
const REQUEST_TABS = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" }
];
const IMPORT_ACTION = { created: "Added", updated: "Updated", error: "Needs attention" };
const SEARCH_DEBOUNCE_MS = 250;
const errorOf = (error, fallback) => error?.response?.data?.message || fallback;

const StatusBadge = ({ product }) => {
  if (product.archived) return <Badge variant="neutral">Archived</Badge>;
  if (!product.available) return <Badge variant="warn" title={missingText(product.missing)}>Hidden from kitchens</Badge>;
  return <Badge variant="success">Available</Badge>;
};

export function ProductsPage({ view = "products" }) {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { isSuperAdmin: canPrice } = useFeatureFlags();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [units, setUnits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState(null);
  const [editing, setEditing] = useState(null); // { product?, request?, initial }
  const [serverErrors, setServerErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [linking, setLinking] = useState(null);
  const [tracker] = useState(createRequestTracker);
  const importInput = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { imported, failed, results } after an import, shown row by row
  const [sheet, setSheet] = useState(""); // "export" (pick Excel or PDF) or "bulk" (Bulk add explained), "" when closed
  const [downloading, setDownloading] = useState(false);
  const [requestStatus, setRequestStatus] = useState("pending");
  const [requestSearch, setRequestSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const loadProducts = useCallback(async () => {
    const request = tracker.start();
    try {
      const { data: next } = await api.get("/products", { params: { status, q }, signal: request.signal });
      if (!request.isLatest()) return;
      setData(next);
      setLoadError("");
    } catch (error) {
      if (!request.isLatest()) return;
      setLoadError(errorOf(error, "Could not load products."));
    }
  }, [status, q, tracker]);

  const loadRequests = useCallback(async () => {
    try {
      const { data: rows } = await api.get("/product-requests");
      setRequests(rows);
    } catch {
      setRequests([]);
    }
  }, []);

  // The product form adds and deletes groups; it waits for this reload before choosing the new one.
  const loadGroups = useCallback(() => api.get("/inventory/stock-groups").then(({ data: rows }) => setGroups(rows)).catch(() => setGroups([])), []);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => () => tracker.cancel(), [tracker]);
  useEffect(() => {
    loadRequests();
    api.get("/products/units").then(({ data: rows }) => setUnits(rows)).catch(() => setUnits([]));
    loadGroups();
  }, [loadRequests, loadGroups]);

  const openEditor = (next) => { setServerErrors({}); setEditing(next); };

  const downloadWorkbook = async (path, name) => {
    setDownloading(true);
    try {
      const response = await api.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) { showToast(errorOf(error, "Could not download the file."), "error"); return false; }
    finally { setDownloading(false); }
  };
  const exportAs = async (path, name) => { if (await downloadWorkbook(path, name)) setSheet(""); };

  const importWorkbook = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) { showToast("Choose an Excel (.xlsx) file.", "error"); return; }
    setImporting(true);
    try {
      const form = new FormData(); form.append("file", file);
      const { data: outcome } = await api.post("/products/import", form, { headers: { "Content-Type": "multipart/form-data" } });
      setSheet("");
      setImportResult(outcome);
      if (outcome.failed) showToast(`${outcome.imported} saved; ${outcome.failed} ${outcome.failed === 1 ? "row needs" : "rows need"} attention.`, "error");
      else showToast(`${outcome.imported} product${outcome.imported === 1 ? "" : "s"} saved.`, "success");
      loadProducts();
    } catch (error) { showToast(errorOf(error, "Could not read the file."), "error"); }
    finally { setImporting(false); }
  };

  const save = async (form) => {
    setBusy(true);
    setServerErrors({});
    try {
      const body = payloadFromForm(form, { canPrice });
      if (editing.request) {
        await api.post(`/product-requests/${editing.request._id}/approve`, { product: body });
        showToast(`${body.name} added and the kitchen request approved.`, "success");
        loadRequests();
      } else if (editing.product) {
        await api.put(`/products/${editing.product._id}`, body);
        showToast(`${body.name} saved.`, "success");
      } else {
        await api.post("/products", body);
        showToast(`${body.name} added.`, "success");
      }
      setEditing(null);
      loadProducts();
    } catch (error) {
      const res = error.response?.data;
      if (res?.code === "VALIDATION") setServerErrors(res.errors || {});
      else showToast(errorOf(error, "Could not save the product."), "error");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (product) => {
    const ok = await confirm({
      title: `Archive ${product.name}?`,
      message: "It disappears from ordering and kitchens, but stays in past records. You can restore it later.",
      confirmLabel: "Archive",
      variant: "danger"
    });
    if (!ok) return;
    try {
      await api.post(`/products/${product._id}/archive`);
      showToast(`${product.name} archived.`, "success");
      loadProducts();
    } catch (error) {
      showToast(errorOf(error, "Could not archive."), "error");
    }
  };

  const restore = async (product) => {
    try {
      await api.post(`/products/${product._id}/restore`);
      showToast(`${product.name} restored.`, "success");
      loadProducts();
    } catch (error) {
      showToast(errorOf(error, "Could not restore."), "error");
    }
  };

  const decide = async (path, body, message) => {
    setBusy(true);
    try {
      await api.post(path, body);
      showToast(message, "success");
      setRejecting(null);
      setLinking(null);
      loadRequests();
    } catch (error) {
      showToast(errorOf(error, "Could not update the request."), "error");
    } finally {
      setBusy(false);
    }
  };

  // The match may be under any status filter, so load the whole catalog for the choice.
  const openLinking = async (request) => {
    setLinking({ request, productId: "", options: null });
    try {
      const { data: all } = await api.get("/products");
      setLinking((prev) => prev && { ...prev, options: all.items.filter((p) => !p.archived) });
    } catch {
      setLinking((prev) => prev && { ...prev, options: [] });
    }
  };

  const raw = data?.counts || { all: 0, available: 0, incomplete: 0, fssai: 0, noPhoto: 0, archived: 0 };
  const counts = { ...raw, nophoto: raw.noPhoto || 0 };
  const products = data?.items || [];

  // Cards like the kitchen's Stock screen: picture banner, name and status, then the facts, then the actions as icon chips.
  const cardTone = (p) => (p.archived ? "archived" : !p.available ? "incomplete" : "ok");
  let productBody;
  if (loadError && !data) productBody = <ErrorState message={loadError} onRetry={loadProducts} />;
  else if (!data) productBody = <div className="kg-glass products-loading" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading products…</div>;
  else if (products.length === 0) {
    productBody = (
      <EmptyState className="kg-glass products-empty" title={q ? `No products match “${q}”` : status === "all" ? "No products yet" : "Nothing here"}
        action={status === "all" && !q ? <Button onClick={() => openEditor({ initial: emptyProductForm() })}><Plus size={14} /> Add the first product</Button> : null}>
        {q ? "Try a different search." : status === "all" ? "Every product a kitchen can hold starts here." : "No products have this status."}
      </EmptyState>
    );
  } else {
    productBody = (
      <ul className="products-grid" aria-label="Products">
        {products.map((p) => (
          <li key={p._id} className={`kg-glass kg-lift product-card product-card--${cardTone(p)}`}>
            <div className={`product-card__media${p.imageUrl ? " has-image" : ""}`} aria-hidden="true">
              {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : <Package size={40} strokeWidth={1.2} />}
            </div>
            <div className="product-card__body">
              <div className="product-card__top">
                <div>
                  <p className="kg-label">{[p.itemType === "daily_use" ? "Daily use" : "Stock item", p.productCode].filter(Boolean).join(" · ")}</p>
                  <h2>{p.name}</h2>
                  <div className="product-card__badges"><StatusBadge product={p} />{p.fssaiMissing && <Badge variant="warn" title="Open Edit and say whether it is food, veg or non-veg, and where it is kept">FSSAI details needed</Badge>}{!p.archived && !p.imageUrl && <Badge variant="warn" title="Kitchen staff pick products by their picture. Open Edit and add one.">No photo</Badge>}</div>
                </div>
                <p className="product-card__price">
                  <strong>{p.pricePerUnit == null ? "Not set" : formatPrice(p.pricePerUnit)}</strong>
                  <span>{p.unit ? `per ${p.unit.symbol}` : "per unit"}</span>
                </p>
              </div>
              <dl className="product-card__facts">
                <div><dt>Group</dt><dd>{p.group?.name || <span className="product-card__none">Not set</span>}</dd></div>
                <div><dt>Unit</dt><dd>{p.unit ? (p.unit.preset ? p.unit.symbol : <Badge variant="warn" title="Not a preset unit">{p.unit.symbol}</Badge>) : <span className="product-card__none">Not set</span>}</dd></div>
                {foodSafetySummary(p) && <div><dt>Food safety</dt><dd>{foodSafetySummary(p)}</dd></div>}
                {p.brand && <div><dt>Brand</dt><dd>{p.brand}</dd></div>}
                <div><dt>Packs</dt><dd>{p.soldInPacks && p.packs.length ? <ul className="product-pack-list">{p.packs.map((pack) => <li key={pack._id}>{packSummary(pack, p.unit?.symbol)}</li>)}</ul> : <span className="product-card__none">Loose only</span>}</dd></div>
                <div><dt>Kitchens</dt><dd>{p.kitchensHolding > 0 ? `Held by ${p.kitchensHolding} ${p.kitchensHolding === 1 ? "kitchen" : "kitchens"}` : <span className="product-card__none">None hold it</span>}</dd></div>
                {!p.archived && !p.available && <div><dt>Missing</dt><dd className="product-card__missing">{missingText(p.missing)}</dd></div>}
              </dl>
              <div className="product-card__actions">
                <Button size="sm" variant="ghost" onClick={() => openEditor({ product: p, initial: formFromProduct(p) })} aria-label={`Edit ${p.name}`}><Edit3 size={14} aria-hidden="true" /> Edit</Button>
                {canPrice && (p.archived ? (
                  <Button size="sm" variant="ghost" onClick={() => restore(p)} aria-label={`Restore ${p.name}`}><ArchiveRestore size={14} aria-hidden="true" /> Restore</Button>
                ) : (
                  <Button size="sm" variant="ghost" disabled={p.kitchensHolding > 0} onClick={() => archive(p)}
                    title={p.kitchensHolding > 0 ? "A product cannot be archived while any kitchen holds it." : undefined} aria-label={`Archive ${p.name}`}>
                    <Archive size={14} aria-hidden="true" /> Archive
                  </Button>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // Kitchen requests: waiting ones first by default; the chips and the search narrow the list.
  const requestQuery = requestSearch.trim().toLowerCase();
  const requestCounts = { all: (requests || []).length, pending: 0, approved: 0, rejected: 0 };
  (requests || []).forEach((r) => { if (r.status in requestCounts) requestCounts[r.status] += 1; });
  const visibleRequests = (requests || []).filter((r) => (requestStatus === "all" || r.status === requestStatus)
    && (!requestQuery || [r.name, r.brand, r.kitchen?.name, r.requestedBy].some((text) => String(text || "").toLowerCase().includes(requestQuery))));
  const requestList = visibleRequests.length === 0 ? (
    <EmptyState className="kg-glass products-empty" title={requestCounts.all === 0 ? "No product requests" : requestQuery ? `No requests match “${requestSearch.trim()}”` : requestStatus === "pending" ? "Nothing waiting" : "Nothing here"}>
      {requestCounts.all === 0 ? "Kitchens can ask for a product that is not listed yet from their stock screen." : requestQuery ? "Try a different name or kitchen." : "No requests have this status."}
    </EmptyState>
  ) : (
    <ul className="product-requests">
      {visibleRequests.map((r) => (
        <li key={r._id} className={`kg-glass product-request product-request--${r.status}${r.status === "pending" ? " kg-glass--cool" : ""}`}>
          <div>
            <p className="kg-label">{r.status === "pending" ? "Waiting for a decision" : r.status}</p>
            <strong>{r.name}</strong>
            <p>{[r.kitchen?.name, r.requestedBy && `by ${r.requestedBy}`, formatDateTime(r.createdAt)].filter(Boolean).join(" · ")}</p>
            {(r.unitSymbol || r.brand) && <p>{[r.unitSymbol && `Unit: ${r.unitSymbol}`, r.brand && `Brand: ${r.brand}`].filter(Boolean).join(" · ")}</p>}
            {r.note && <p className="product-request__note">“{r.note}”</p>}
            {r.status !== "pending" && (
              <p className="product-request__decision">
                {r.status === "approved" ? `Approved${r.product ? ` as ${r.product.name}` : ""}` : `Rejected: ${r.decisionNote}`}
                {r.decidedBy && ` · ${r.decidedBy}`}
              </p>
            )}
          </div>
          {r.status === "pending" ? (
            <div className="product-request__actions">
              <Button size="sm" onClick={() => openEditor({ request: r, initial: formFromProduct({ name: r.name, brand: r.brand, unitSymbol: r.unitSymbol }, { units }) })}><Plus size={14} aria-hidden="true" /> Create product</Button>
              <Button size="sm" variant="ghost" onClick={() => openLinking(r)}>Already listed</Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting({ request: r, note: "" })}><X size={14} aria-hidden="true" /> Reject</Button>
            </div>
          ) : <Badge variant={r.status === "approved" ? "success" : "neutral"}>{r.status === "approved" ? "Approved" : "Rejected"}</Badge>}
        </li>
      ))}
    </ul>
  );
  const requestBody = requests === null ? <div className="kg-glass products-loading" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading requests…</div> : (
    <>
      <label className="ks-search kg-float">
        <Search size={16} aria-hidden="true" />
        <input type="search" aria-label="Search requests" placeholder="Product, brand or kitchen" value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} />
        {requestSearch && <button type="button" aria-label="Clear search" onClick={() => setRequestSearch("")}><X size={16} aria-hidden="true" /></button>}
      </label>
      <section className="kg-glass ks-controls" aria-label="Filter requests">
        <div className="ks-filters" role="group" aria-label="Filter by status">
          {REQUEST_TABS.map((tab) => (
            <button type="button" key={tab.value} aria-pressed={requestStatus === tab.value} className={requestStatus === tab.value ? "ks-filter ks-filter--active" : "ks-filter"} onClick={() => setRequestStatus(tab.value)}>
              {tab.label}<span>{requestCounts[tab.value]}</span>
            </button>
          ))}
        </div>
      </section>
      <p className="products-results" aria-live="polite"><strong>{visibleRequests.length}</strong> {visibleRequests.length === 1 ? "request" : "requests"}{requestQuery ? ` matching “${requestSearch.trim()}”` : ""}</p>
      {requestList}
    </>
  );

  return (
    <div className="products-shell">
      <PageHeader
        title={view === "products" ? "Products" : "Kitchen requests"}
        subtitle={view === "products" ? "The master list. Every product a kitchen holds comes from here." : "Products the kitchens asked for that are not listed yet."}
        actions={view === "products" && (
          <>
            <input ref={importInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={importWorkbook} />
            <Button size="sm" variant="ghost" onClick={() => setSheet("export")}><Download size={14} aria-hidden="true" /> Export</Button>
            <Button size="sm" variant="ghost" onClick={() => setSheet("bulk")}><Upload size={14} aria-hidden="true" /> Bulk add</Button>
            <Button onClick={() => openEditor({ initial: emptyProductForm() })}><Plus size={16} aria-hidden="true" /> Add product</Button>
          </>
        )}
      />

      <div className="products-page">
        {view === "products" ? (
          <>
            <label className="ks-search kg-float">
              <Search size={16} aria-hidden="true" />
              <input type="search" aria-label="Search products" placeholder="Name, brand, code or group" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={16} aria-hidden="true" /></button>}
            </label>
            {counts.incomplete > 0 && status !== "incomplete" && (
              <Banner variant="warn">
                {canPrice && counts.needsPrice > 0 ? (
                  <>{counts.needsPrice} {counts.needsPrice === 1 ? "product needs" : "products need"} a price from you before kitchens can use {counts.needsPrice === 1 ? "it" : "them"}
                    {counts.incomplete > counts.needsPrice ? `; ${counts.incomplete - counts.needsPrice} more ${counts.incomplete - counts.needsPrice === 1 ? "is" : "are"} missing other details` : ""}.</>
                ) : (
                  <>{counts.incomplete} {counts.incomplete === 1 ? "product is" : "products are"} hidden from kitchens until the missing details are filled in{canPrice ? "" : " (prices are set by a super-admin)"}.</>
                )}{" "}
                <button type="button" className="exec-link" onClick={() => setStatus("incomplete")}>Show {counts.incomplete === 1 ? "it" : "them"}</button>
              </Banner>
            )}
            {counts.fssai > 0 && status !== "fssai" && (
              <Banner variant="info">
                {counts.fssai} {counts.fssai === 1 ? "product has" : "products have"} no FSSAI details yet (food or not, veg or non-veg, where it is kept). {counts.fssai === 1 ? "It stays" : "They stay"} available to kitchens; open Edit to fill them in.{" "}
                <button type="button" className="exec-link" onClick={() => setStatus("fssai")}>Show {counts.fssai === 1 ? "it" : "them"}</button>
              </Banner>
            )}
            <section className="kg-glass ks-controls" aria-label="Filter products">
              <div className="ks-filters" role="group" aria-label="Filter by status">
                {STATUS_TABS.map((tab) => (
                  <button type="button" key={tab.value} aria-pressed={status === tab.value} className={status === tab.value ? "ks-filter ks-filter--active" : "ks-filter"} onClick={() => setStatus(tab.value)}>
                    {tab.label}<span>{counts[tab.value]}</span>
                  </button>
                ))}
              </div>
            </section>
            <p className="products-results" aria-live="polite"><strong>{products.length}</strong> {products.length === 1 ? "product" : "products"}{q ? ` matching “${q}”` : ""}</p>
            {productBody}
          </>
        ) : requestBody}
      </div>

      {editing && (
        <ProductForm
          key={editing.product?._id || editing.request?._id || "new"}
          title={editing.request ? `Create “${editing.request.name}”` : editing.product ? `Edit ${editing.product.name}` : "Add product"}
          initial={editing.initial}
          units={units}
          groups={groups}
          onGroupsChanged={loadGroups}
          canPrice={canPrice}
          onPackTypeRemoved={() => loadProducts()}
          knownPackNames={products.flatMap((p) => (p.packs || []).map((pack) => pack.name))}
          busy={busy}
          serverErrors={serverErrors}
          submitLabel={editing.request ? "Create and approve" : "Save product"}
          notice={editing.request && (
            <Banner variant="info">
              Requested by {editing.request.kitchen?.name || "a kitchen"}{editing.request.note ? `: “${editing.request.note}”.` : "."} Saving creates the product and tells the kitchen.
            </Banner>
          )}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      )}

      {rejecting && (
        <Modal title={`Reject “${rejecting.request.name}”?`} onClose={() => !busy && setRejecting(null)} actions={(
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" disabled={busy || !rejecting.note.trim()} onClick={() => decide(`/product-requests/${rejecting.request._id}/reject`, { note: rejecting.note }, "Request rejected.")}>Reject request</Button>
          </>
        )}>
          <Field label="Reason the kitchen will see">
            <textarea rows={3} value={rejecting.note} maxLength={300} onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })} />
          </Field>
        </Modal>
      )}

      {sheet === "export" && (
        <Modal title="Export products" onClose={() => !downloading && setSheet("")} closeButton="right">
          <p className="product-form__hint">Please pick the format for exporting.</p>
          <div className="export-choices">
            <button type="button" className="kg-glass export-choice" disabled={downloading} onClick={() => exportAs("/products/export/excel", downloadName("Products", "xlsx"))}>
              <FileSpreadsheet size={22} aria-hidden="true" />
              <span><strong>Excel</strong><small>To change many products: edit it, then upload it with Bulk add.</small></span>
            </button>
            <button type="button" className="kg-glass export-choice" disabled={downloading} onClick={() => exportAs("/products/export/pdf", downloadName("Products", "pdf"))}>
              <FileText size={22} aria-hidden="true" />
              <span><strong>PDF</strong><small>To read or print. Every column is explained at the top.</small></span>
            </button>
          </div>
          {downloading && <p className="product-form__hint" role="status">Preparing the file…</p>}
        </Modal>
      )}

      {sheet === "bulk" && (
        <Modal title="Bulk add products" onClose={() => !importing && setSheet("")} closeButton="right" actions={(
          <Button disabled={importing || downloading} onClick={() => importInput.current?.click()}><Upload size={15} aria-hidden="true" /> {importing ? "Uploading…" : "Choose file"}</Button>
        )}>
          <ol className="bulk-steps">
            <li>Download the template. To change existing products, use <strong>Export › Excel</strong> instead.</li>
            <li>Fill one row per product. Use the dropdowns; the grey line under each heading says what goes there.</li>
            <li>Upload it here. A row with a Product ID updates that product; a row without one adds a new product.</li>
          </ol>
          <button type="button" className="bulk-template-link" disabled={downloading || importing} onClick={() => downloadWorkbook("/products/import-template", downloadName("Products-template", "xlsx"))}>
            <FileSpreadsheet size={15} aria-hidden="true" /> <span>{downloading ? "Preparing…" : "Download template"}</span>
          </button>
        </Modal>
      )}

      {importResult && (
        <Modal title="Bulk add finished" onClose={() => setImportResult(null)} wide actions={<Button onClick={() => setImportResult(null)}>Close</Button>}>
          <p className="product-form__hint">
            {importResult.imported} {importResult.imported === 1 ? "row" : "rows"} saved, {importResult.failed} {importResult.failed === 1 ? "row needs" : "rows need"} attention.
            {importResult.failed > 0 && " Fix those rows in the file and upload it again; the rows that went through are already saved."}
          </p>
          <ul className="import-results" aria-label="Import results">
            {[...importResult.results].sort((a, b) => Number(b.action === "error") - Number(a.action === "error") || a.row - b.row).map((row) => (
              <li key={row.row} className={`kg-row import-result import-result--${row.action}`}>
                <span className="import-result__row">Row {row.row}</span>
                <strong>{IMPORT_ACTION[row.action] || row.action}</strong>
                <span className="import-result__text">{row.action === "error" ? row.message : row.name}</span>
              </li>
            ))}
            {importResult.results.length === 0 && <li className="kg-row import-result"><span className="import-result__text">The file had no product rows.</span></li>}
          </ul>
        </Modal>
      )}

      {linking && (
        <Modal title={`“${linking.request.name}” is already listed`} onClose={() => !busy && setLinking(null)} actions={(
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setLinking(null)}>Cancel</Button>
            <Button disabled={busy || !linking.productId} onClick={() => decide(`/product-requests/${linking.request._id}/approve`, { existingProductId: linking.productId }, "Request approved.")}>Approve</Button>
          </>
        )}>
          <Field label="Matching product">
            <Select value={linking.productId} onChange={(e) => setLinking({ ...linking, productId: e.target.value })}>
              <option value="">Choose…</option>
              {(linking.options || []).map((p) => <option key={p._id} value={p._id}>{p.name}{p.unit ? ` (${p.unit.symbol})` : ""}</option>)}
            </Select>
          </Field>
          <p className="product-form__hint">The kitchen is told the product is available as this one.</p>
        </Modal>
      )}
      {dialog}
    </div>
  );
}

