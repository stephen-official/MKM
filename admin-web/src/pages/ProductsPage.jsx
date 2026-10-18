import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArchiveRestore, Download, Edit3, FileSpreadsheet, Package, Plus, Search, Upload } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import { formatDateTime } from "../businessTime.js";
import { useFeatureFlags } from "../features/FeatureFlagsContext.js";
import { Badge, Banner, Button, Card, DataTable, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, Select, Tabs } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { createRequestTracker } from "./executive/requestTracker.js";
import { ProductForm } from "./products/ProductForm.jsx";
import { emptyProductForm, formFromProduct, formatPrice, missingText, packSummary, payloadFromForm } from "./products/productForm.js";
import "./products/products.css";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "incomplete", label: "Incomplete" },
  { value: "archived", label: "Archived" }
];
const SEARCH_DEBOUNCE_MS = 250;
const errorOf = (error, fallback) => error?.response?.data?.message || fallback;

const StatusBadge = ({ product }) => {
  if (product.archived) return <Badge variant="neutral">Archived</Badge>;
  if (!product.available) return <Badge variant="warn" title={missingText(product.missing)}>Hidden from kitchens</Badge>;
  return <Badge variant="success">Available</Badge>;
};

export function ProductsPage() {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const { isSuperAdmin: canPrice } = useFeatureFlags();
  const [view, setView] = useState("products");
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
  const [downloading, setDownloading] = useState(false);

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

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => () => tracker.cancel(), [tracker]);
  useEffect(() => {
    loadRequests();
    api.get("/products/units").then(({ data: rows }) => setUnits(rows)).catch(() => setUnits([]));
    api.get("/inventory/stock-groups").then(({ data: rows }) => setGroups(rows)).catch(() => setGroups([]));
  }, [loadRequests]);

  const pending = useMemo(() => (requests || []).filter((r) => r.status === "pending"), [requests]);

  const openEditor = (next) => { setServerErrors({}); setEditing(next); };

  const downloadWorkbook = async (path, name) => {
    setDownloading(true);
    try {
      const response = await api.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url; link.download = name; link.click();
      URL.revokeObjectURL(url);
    } catch (error) { showToast(errorOf(error, "Could not download the spreadsheet."), "error"); }
    finally { setDownloading(false); }
  };

  const importWorkbook = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) { showToast("Choose an .xlsx Excel workbook.", "error"); return; }
    setImporting(true);
    try {
      const form = new FormData(); form.append("file", file);
      const { data: outcome } = await api.post("/products/import", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (outcome.failed) {
        const detail = outcome.results.filter((row) => row.action === "error").slice(0, 3).map((row) => `Row ${row.row}: ${row.message}`).join(" ");
        showToast(`${outcome.imported} imported; ${outcome.failed} need attention. ${detail}`, "error");
      } else showToast(`${outcome.imported} product${outcome.imported === 1 ? "" : "s"} imported.`, "success");
      loadProducts();
    } catch (error) { showToast(errorOf(error, "Could not import the spreadsheet."), "error"); }
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

  const counts = data?.counts || { all: 0, available: 0, incomplete: 0, archived: 0 };
  const products = data?.items || [];

  let productBody;
  if (loadError && !data) productBody = <ErrorState message={loadError} onRetry={loadProducts} />;
  else if (!data) productBody = <LoadingState label="Loading products…" />;
  else if (products.length === 0) {
    productBody = (
      <EmptyState title={q ? `No products match “${q}”` : status === "all" ? "No products yet" : "Nothing here"}
        action={status === "all" && !q ? <Button onClick={() => openEditor({ initial: emptyProductForm() })}><Plus size={14} /> Add the first product</Button> : null}>
        {q ? "Try a different search." : status === "all" ? "Every product a kitchen can hold starts here." : "No products have this status."}
      </EmptyState>
    );
  } else {
    productBody = (
      <DataTable className="products-table">
        <thead>
          <tr>
            <th scope="col">Product</th><th scope="col">Group</th><th scope="col">Unit</th><th scope="col" className="num">Price per unit</th>
            <th scope="col">Packs</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} className={p.archived ? "products-row--archived" : undefined}>
              <th scope="row">
                <div className="product-cell">
                  <span className="product-cell__thumb">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <Package size={18} aria-hidden="true" />}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{[p.itemType === "daily_use" ? "Daily use" : "Stock item", p.brand, p.productCode].filter(Boolean).join(" · ")}</small>
                  </span>
                </div>
              </th>
              <td>{p.group?.name || "—"}</td>
              <td>{p.unit ? (p.unit.preset ? p.unit.symbol : <Badge variant="warn" title="Not a preset unit">{p.unit.symbol}</Badge>) : "—"}</td>
              <td className="num">{formatPrice(p.pricePerUnit)}</td>
              <td>{p.soldInPacks && p.packs.length ? <ul className="product-pack-list">{p.packs.map((pack) => <li key={pack._id}>{packSummary(pack, p.unit?.symbol)}</li>)}</ul> : <span className="muted">—</span>}</td>
              <td>
                <StatusBadge product={p} />
                {!p.archived && !p.available && <small className="product-cell__missing">{missingText(p.missing)}</small>}
                {p.kitchensHolding > 0 && <small className="product-cell__missing">Held by {p.kitchensHolding} {p.kitchensHolding === 1 ? "kitchen" : "kitchens"}</small>}
              </td>
              <td>
                <div className="row-actions">
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
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    );
  }

  const requestBody = requests === null ? <LoadingState label="Loading requests…" /> : requests.length === 0 ? (
    <EmptyState title="No product requests">Kitchens can ask for a product that is not listed yet from their stock screen.</EmptyState>
  ) : (
    <ul className="product-requests">
      {requests.map((r) => (
        <li key={r._id} className={`product-request product-request--${r.status}`}>
          <div>
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
            <div className="row-actions">
              <Button size="sm" onClick={() => openEditor({ request: r, initial: formFromProduct({ name: r.name, brand: r.brand, unitSymbol: r.unitSymbol }, { units }) })}>Create product</Button>
              <Button size="sm" variant="ghost" onClick={() => openLinking(r)}>Already listed</Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting({ request: r, note: "" })}>Reject</Button>
            </div>
          ) : <Badge variant={r.status === "approved" ? "success" : "neutral"}>{r.status === "approved" ? "Approved" : "Rejected"}</Badge>}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="products-shell">
      <PageHeader
        title="Products"
        subtitle="The master list. Every product a kitchen holds comes from here."
        actions={view === "products" && (
          <>
            <label className="products-search">
              <Search size={14} aria-hidden="true" />
              <input type="search" aria-label="Search products" placeholder="Name, brand, code or group" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <input ref={importInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={importWorkbook} />
            <Button variant="ghost" disabled={downloading} onClick={() => downloadWorkbook("/products/import-template", "products-import-template.xlsx")}><FileSpreadsheet size={16} aria-hidden="true" /> Template</Button>
            <Button variant="ghost" disabled={downloading} onClick={() => downloadWorkbook("/products/export/excel", "products-export.xlsx")}><Download size={16} aria-hidden="true" /> Export</Button>
            <Button variant="ghost" disabled={importing} onClick={() => importInput.current?.click()}><Upload size={16} aria-hidden="true" /> {importing ? "Importing…" : "Import"}</Button>
            <Button onClick={() => openEditor({ initial: emptyProductForm() })}><Plus size={16} aria-hidden="true" /> Add product</Button>
          </>
        )}
      >
        <Tabs label="Products sections" value={view} onChange={setView} items={[
          { value: "products", label: `Products (${counts.all})` },
          { value: "requests", label: pending.length ? `Kitchen requests (${pending.length} new)` : "Kitchen requests" }
        ]} />
      </PageHeader>

      <div className="products-page">
        {view === "products" ? (
          <>
            {counts.incomplete > 0 && status !== "incomplete" && (
              <Banner variant="warn">
                {counts.incomplete} {counts.incomplete === 1 ? "product is" : "products are"} hidden from kitchens until the missing details are filled in{canPrice ? "" : " (prices are set by a super-admin)"}.{" "}
                <button type="button" className="exec-link" onClick={() => setStatus("incomplete")}>Show {counts.incomplete === 1 ? "it" : "them"}</button>
              </Banner>
            )}
            <div className="products-filters" role="group" aria-label="Filter by status">
              {STATUS_TABS.map((tab) => (
                <button type="button" key={tab.value} aria-pressed={status === tab.value} className={status === tab.value ? "products-filter products-filter--active" : "products-filter"} onClick={() => setStatus(tab.value)}>
                  {tab.label}<span>{counts[tab.value]}</span>
                </button>
              ))}
            </div>
            <Card>{productBody}</Card>
          </>
        ) : <Card>{requestBody}</Card>}
      </div>

      {editing && (
        <ProductForm
          key={editing.product?._id || editing.request?._id || "new"}
          title={editing.request ? `Create “${editing.request.name}”` : editing.product ? `Edit ${editing.product.name}` : "Add product"}
          initial={editing.initial}
          units={units}
          groups={groups}
          canPrice={canPrice}
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

