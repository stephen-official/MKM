import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Package, RefreshCw } from "lucide-react";
import { api } from "../api.js";
import { useToast } from "../useToast.js";
import {
  Badge,
  Banner,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader, DateField, Select } from "../components/ui/index.jsx";
import { ProductCombobox } from "./ledger/ProductCombobox.jsx";
import { LedgerSummary } from "./ledger/LedgerSummary.jsx";
import { formatQty } from "./ledger/format.js";

const errorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

/* Blob responses carry their JSON error as a Blob; read the message out of it. */
const blobErrorMessage = async (err, fallback) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.message || parsed.error || fallback;
    } catch {
      return fallback;
    }
  }
  return errorMessage(err, fallback);
};

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
};

export default function ProductLedger() {
  const { showToast } = useToast();

  const [godowns, setGodowns] = useState([]);
  const [selectedGodown, setSelectedGodown] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [ledger, setLedger] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openingStock, setOpeningStock] = useState(0);
  const [currentStock, setCurrentStock] = useState(0);

  const [loadingSetup, setLoadingSetup] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Ignore responses that arrive after a newer request has been issued.
  const setupReq = useRef(0);
  const ledgerReq = useRef(0);

  const rangeInvalid = Boolean(startDate && endDate && startDate > endDate);

  /* Godowns, and the products of the selected godown. */
  const loadSetup = useCallback(async () => {
    const id = ++setupReq.current;
    setLoadingSetup(true);
    setSetupError("");
    try {
      const [godownRes, productRes] = await Promise.all([
        api.get("/product-ledger/godowns"),
        selectedGodown
          ? api.get("/product-ledger/products", { params: { godownId: selectedGodown } })
          : Promise.resolve({ data: [] })
      ]);
      if (id !== setupReq.current) return;
      setGodowns(Array.isArray(godownRes.data) ? godownRes.data : []);
      setProducts(Array.isArray(productRes.data) ? productRes.data : []);
    } catch (err) {
      if (id !== setupReq.current) return;
      const message = errorMessage(err, "Failed to load godowns and products.");
      setSetupError(message);
      setProducts([]);
      showToast(message, "error");
    } finally {
      if (id === setupReq.current) setLoadingSetup(false);
    }
  }, [selectedGodown, showToast]);

  const loadLedger = useCallback(async () => {
    const id = ++ledgerReq.current;
    if (!selectedGodown || !selectedProduct || rangeInvalid) {
      setLedger([]);
      setOpeningStock(0);
      setCurrentStock(0);
      setLedgerError("");
      setLoadingLedger(false);
      return;
    }
    setLoadingLedger(true);
    setLedgerError("");
    try {
      const res = await api.get(`/product-ledger/${selectedProduct}`, {
        params: { godownId: selectedGodown, startDate, endDate }
      });
      if (id !== ledgerReq.current) return;
      setLedger(Array.isArray(res.data?.ledger) ? res.data.ledger : []);
      setOpeningStock(Number(res.data?.openingStock || 0));
      setCurrentStock(Number(res.data?.currentStock || 0));
    } catch (err) {
      if (id !== ledgerReq.current) return;
      const message = errorMessage(err, "Failed to load the ledger.");
      setLedger([]);
      setOpeningStock(0);
      setCurrentStock(0);
      setLedgerError(message);
      showToast(message, "error");
    } finally {
      if (id === ledgerReq.current) setLoadingLedger(false);
    }
  }, [selectedGodown, selectedProduct, startDate, endDate, rangeInvalid, showToast]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSetup(), loadLedger()]);
    setRefreshing(false);
  };

  const changeGodown = (id) => {
    setSelectedGodown(id);
    setSelectedProduct("");
    setProducts([]);
    setLedger([]);
  };

  const sortedLedger = useMemo(
    () => [...ledger].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [ledger]
  );

  const totals = useMemo(() => {
    const inward = sortedLedger.reduce((sum, row) => sum + Number(row.qtyIn || 0), 0);
    const outward = sortedLedger.reduce((sum, row) => sum + Number(row.qtyOut || 0), 0);
    return { inward, outward };
  }, [sortedLedger]);

  const selectedProductData = products.find((p) => p._id === selectedProduct);
  const godownName = godowns.find((g) => g._id === selectedGodown)?.name || "";

  const exportExcel = async () => {
    if (!selectedGodown || !selectedProduct || exporting) return;
    setExporting(true);
    try {
      const res = await api.get(`/product-ledger/${selectedProduct}/export/excel`, {
        params: { godownId: selectedGodown, startDate, endDate },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedProductData?.name || "Product"}-Ledger.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Ledger exported.", "success");
    } catch (err) {
      showToast(await blobErrorMessage(err, "Export failed."), "error");
    } finally {
      setExporting(false);
    }
  };

  let content;
  if (setupError) content = <ErrorState message={setupError} onRetry={loadSetup} />;
  else if (loadingSetup) content = <LoadingState label="Loading godowns…" />;
  else if (!selectedGodown) content = <EmptyState title="Select a godown">Choose a godown to see its products.</EmptyState>;
  else if (products.length === 0) content = <EmptyState title="No products in this godown">There is no stock movement to show here yet.</EmptyState>;
  else if (!selectedProduct) content = <EmptyState title="Select a product">Search for a product to see its stock movement.</EmptyState>;
  else if (rangeInvalid) content = <EmptyState title="Check the date range">The start date must be on or before the end date.</EmptyState>;
  else if (loadingLedger) content = <LoadingState label="Loading ledger…" />;
  else if (ledgerError) content = <ErrorState message={ledgerError} onRetry={loadLedger} />;
  else if (sortedLedger.length === 0) content = <EmptyState title="No transactions found">Nothing matches the selected dates for this product.</EmptyState>;
  else
    content = (
      <DataTable>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Type</th>
            <th scope="col">Reference</th>
            <th scope="col" style={{ textAlign: "right" }}>Inward</th>
            <th scope="col" style={{ textAlign: "right" }}>Outward</th>
            <th scope="col" style={{ textAlign: "right" }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {sortedLedger.map((row, index) => (
            <tr key={`${row.date}-${index}`}>
              <td>{formatDate(row.date)}</td>
              <td><Badge>{row.type}</Badge></td>
              <td>{row.reference || "-"}</td>
              <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 650 }}>
                {Number(row.qtyIn || 0) > 0 ? `+${formatQty(row.qtyIn)}` : "-"}
              </td>
              <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: 650 }}>
                {Number(row.qtyOut || 0) > 0 ? `-${formatQty(row.qtyOut)}` : "-"}
              </td>
              <td style={{ textAlign: "right", fontWeight: 650 }}>{formatQty(row.balance)}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <PageHeader
        title="Product Ledger"
        subtitle="Godown wise stock movement"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={16} style={refreshing ? { animation: "admin-spin 1s linear infinite" } : undefined} />
            </Button>
            <Button variant="dark" onClick={exportExcel} disabled={!selectedProduct || exporting || rangeInvalid}>
              <Download size={15} /> {exporting ? "Exporting…" : "Export"}
            </Button>
          </>
        }
      >
        <Select
          aria-label="Godown"
          value={selectedGodown}
          onChange={(e) => changeGodown(e.target.value)}
          style={{ width: 170 }}
        >
          <option value="">Select godown</option>
          {godowns.map((g) => (
            <option key={g._id} value={g._id}>{g.name}</option>
          ))}
        </Select>
        <ProductCombobox
          key={selectedGodown}
          products={products}
          value={selectedProduct}
          onSelect={setSelectedProduct}
          disabled={!selectedGodown || loadingSetup}
        />
        <DateField
          
          aria-label="Start date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <DateField
          
          aria-label="End date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </PageHeader>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minHeight: 0, padding: "20px 32px 28px" }}>
        {rangeInvalid && <Banner variant="warn">The start date is after the end date.</Banner>}

        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            {selectedProductData?.imageUrl ? (
              <img
                src={selectedProductData.imageUrl}
                alt=""
                style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", objectFit: "cover" }}
              />
            ) : (
              <div
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--primary-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Package size={22} color="var(--primary)" />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 650, color: "var(--ink)" }}>
                {selectedProductData?.name || "Select a product"}
              </div>
              <div className="page-subtitle">
                {godownName}
                {selectedProductData?.unit ? ` • ${selectedProductData.unit}` : ""}
              </div>
            </div>
          </div>
          <LedgerSummary
            opening={openingStock}
            inward={totals.inward}
            outward={totals.outward}
            current={currentStock}
          />
        </Card>

        <Card style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 0 }}>{content}</Card>
      </div>
    </div>
  );
}
