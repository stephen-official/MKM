import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ban, CheckCircle2, Pencil, Save, ShoppingCart, Truck } from "lucide-react";
import { api } from "../../api.js";
import { useToast } from "../../useToast.js";
import {
  Badge, Banner, Button, Card, DateField, DetailPanel, EmptyState, ErrorState, Field, Meta, Modal, RailItem, RailList, Select, SplitView
} from "../../components/ui/index.jsx";
import { useConfirm } from "../../components/ui/useConfirm.jsx";
import { allSharesApproved, canAdjustLine, canApprove, canCancel, canDispatch, canDispatchAll, canDispatchLine, canMarkOrdered, canRejectLine, canRejectShare, canSetPurchaseDetails, closesInText, editableQuantity, eventActor, eventText, hasLiveItems, lineDelivery, lineLabel, orderStage, requestedLabel, shareStage, sourceLabel } from "./sharedOrders.js";
import { RaiseOrderDialog } from "./RaiseOrderDialog.jsx";

const BASE = "/procurement/collaborative-purchase-orders";
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.response?.data?.error || fallback;
const when = (value, withTime = false) => (value ? new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {})
}).format(new Date(value)) : "—");
const itemNames = (order) => [...new Set((order.combinedItems || []).map((line) => line.stockItemId?.name).filter(Boolean))].join(", ");
const STAGE_VARIANT = { "Not approved": "neutral", "Needs approval": "warn", "Place order": "warn", "Needs to be dispatched": "warn", "Incomplete dispatch": "warn", Dispatched: "info", "Partly received": "info", "Problem to settle": "alert", Delivered: "success", Cancelled: "neutral" };
const DELIVERY_VARIANT = { "Not approved": "neutral", "Not sent": "neutral", "On the way": "info", "Problem raised": "warn", Received: "success" };

/**
 * Kitchens' shared orders: approve or reject lines, kitchens or everything, mark the order as placed, and dispatch
 * each kitchen. `raising` opens the "Raise order for a kitchen" dialog (the page header's button sets it).
 */
export function SharedOrdersPanel({ raising = false, onRaiseClose = () => {} }) {
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [suppliers, setSuppliers] = useState([]);
  // Supplier and invoice as typed per order (keyed by order id); "Mark as ordered" sends the chosen supplier too.
  const [purchaseEdits, setPurchaseEdits] = useState({});
  // A rejection or cancellation waiting for its reason: { path, body, title, confirmLabel, success, note }.
  const [rejecting, setRejecting] = useState(null);
  // A line whose quantity is being reviewed: the API interprets quantity in this displayed unit.
  const [adjusting, setAdjusting] = useState(null);
  const requestId = useRef(0);

  const fetchList = () => api.get(BASE, { params: { limit: 100 } }).then((res) => res.data.items || []);
  const applyList = useCallback((list) => {
    setOrders(list);
    setLoadError("");
    setSelectedId((previous) => (list.some((order) => order._id === previous) ? previous : list[0]?._id ?? null));
  }, []);
  // Runs one request; only the latest one may update the screen.
  const run = useCallback((request) => {
    const current = ++requestId.current;
    const latest = () => current === requestId.current;
    return request
      .then((list) => { if (latest()) applyList(list); })
      .catch((error) => { if (latest()) setLoadError(errorMessage(error, "Failed to load shared orders")); })
      .finally(() => { if (latest()) { setLoading(false); setNow(new Date()); } });
  }, [applyList]);

  const load = useCallback(() => {
    setLoading(true);
    return run(fetchList());
  }, [run]);

  useEffect(() => { run(fetchList()); }, [run]);
  useEffect(() => { api.get("/suppliers").then((res) => setSuppliers(res.data || [])).catch(() => setSuppliers([])); }, []);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);

  const order = useMemo(() => orders.find((candidate) => candidate._id === selectedId) || null, [orders, selectedId]);
  const productIdOf = (line) => String(line.stockItemId?._id || line.stockItemId);
  const savedExpiry = Object.fromEntries((order?.expiryByProduct || []).map((entry) => [String(entry.stockItemId?._id || entry.stockItemId), entry.expiryDate]));
  const savedOverrides = Object.fromEntries((order?.supplierByProduct || []).map((entry) => [String(entry.stockItemId?._id || entry.stockItemId), String(entry.supplierId?._id || entry.supplierId)]));
  const purchase = purchaseEdits[order?._id] || { supplierId: order?.supplierId || "", invoiceNo: order?.invoiceNo || "", expiry: savedExpiry, overrides: savedOverrides };
  const purchaseDirty = order && (purchase.supplierId !== (order.supplierId || "") || purchase.invoiceNo !== (order.invoiceNo || "")
    || (order.combinedItems || []).some((line) => (purchase.expiry[productIdOf(line)] || "") !== (savedExpiry[productIdOf(line)] || "")
      || (purchase.overrides[productIdOf(line)] || "") !== (savedOverrides[productIdOf(line)] || "")));
  const setPurchase = (change) => setPurchaseEdits((edits) => ({ ...edits, [order._id]: { ...purchase, ...change } }));

  /** Runs one admin action, optionally after a confirmation, then reloads so every kitchen's state is current. */
  const act = async (path, body, success, question) => {
    if (busy) return false;
    if (question && !(await confirm(question))) return false;
    setBusy(true);
    let done = false;
    try {
      if (path === "status" || path === "purchase") await api.patch(`${BASE}/${order._id}/${path}`, body);
      else await api.post(`${BASE}/${order._id}/${path}`, body);
      showToast(success, "success");
      setPurchaseEdits((edits) => ({ ...edits, [order._id]: undefined }));
      done = true;
    } catch (error) {
      showToast(errorMessage(error, "That did not work. Reload and try again."), "error");
    } finally {
      setBusy(false);
      await load();
    }
    return done;
  };
  /** Asks for the reason the kitchen will see, then rejects or cancels. */
  const askReason = (path, body, title, confirmLabel, success) => setRejecting({ path, body, title, confirmLabel, success, note: "" });
  const sendRejection = async () => {
    const reason = rejecting.note.trim();
    if (!reason) return;
    if (await act(rejecting.path, { ...rejecting.body, reason }, rejecting.success)) setRejecting(null);
  };
  const sendAdjustment = async () => {
    const quantity = Number(adjusting.quantity);
    if (!(quantity > 0)) return;
    const body = { godownId: adjusting.godownId, stockItemId: adjusting.stockItemId, quantity };
    if (adjusting.packId) body.packId = adjusting.packId;
    if (await act("adjust", body, `${adjusting.name} quantity changed and approved`)) setAdjusting(null);
  };
  const raised = async (created) => {
    onRaiseClose();
    await load();
    setSelectedId(created._id);
  };

  const raiseDialog = raising && <RaiseOrderDialog onClose={onRaiseClose} onCreated={raised} />;
  if (loadError && !orders.length) return <>{raiseDialog}<ErrorState message={loadError} onRetry={load} /></>;

  const approvable = order && canApprove(order) && hasLiveItems(order);
  return (
    <>
      <SplitView
        rail={
          <RailList title="Shared orders" count={orders.length} loading={loading && !orders.length}
            empty={<EmptyState title="No shared orders yet">Orders kitchens start in the kitchen app, and orders you raise for a kitchen, appear here.</EmptyState>}>
            {orders.map((candidate) => (
              <RailItem key={candidate._id} active={candidate._id === selectedId} onClick={() => setSelectedId(candidate._id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong>{candidate.title || itemNames(candidate) || candidate.orderNo}</strong>
                  <Badge variant={STAGE_VARIANT[orderStage(candidate)]}>{orderStage(candidate)}</Badge>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                  {candidate.emergency && <Badge variant="alert">Urgent</Badge>}
                  {candidate.source === "admin" && <Badge variant="info">{sourceLabel(candidate)}</Badge>}
                  <span>{candidate.kitchenCount} {candidate.kitchenCount === 1 ? "kitchen" : "kitchens"}</span>
                  <span>{candidate.status === "open" ? closesInText(candidate.closesAt, now) : `Needed by ${when(candidate.neededBy)}`}</span>
                </div>
              </RailItem>
            ))}
          </RailList>
        }
      >
        {order ? (
          <DetailPanel
            head={
              <>
                <Meta label="Order">
                  {order.orderNo}
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {order.source === "admin" ? `${sourceLabel(order)}${order.createdBy?.name ? ` · ${order.createdBy.name}` : ""}` : `Requested by ${order.createdByGodown?.name || "a kitchen"}`}
                  </div>
                </Meta>
                <Meta label="Next step"><Badge variant={STAGE_VARIANT[orderStage(order)]}>{orderStage(order)}</Badge> {order.emergency && <Badge variant="alert">Urgent</Badge>}</Meta>
                <Meta label="Needed by">{when(order.neededBy, order.emergency)}</Meta>
                <Meta label="Ordering" align="end">{order.status === "open" ? closesInText(order.closesAt, now) : "Ordering closed"}</Meta>
              </>
            }
            foot={
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", width: "100%" }}>
                {canCancel(order) && (
                  <Button variant="ghost" disabled={busy} style={{ marginRight: "auto" }}
                    onClick={() => askReason("status", { status: "cancelled" }, "Cancel this order?", "Cancel order", "Order cancelled")}>
                    <Ban size={18} /> Cancel order
                  </Button>
                )}
                {approvable && (allSharesApproved(order) ? (
                  <>
                    <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 13 }}>
                      Every kitchen has been reviewed. Close the order so no one else can join, then mark it as ordered.
                    </span>
                    <Button disabled={busy} onClick={() => act("approve", {}, "Order closed and approved", {
                      title: "Close and finish approval?",
                      message: "No other kitchen can join or change this order after this.",
                      confirmLabel: "Close & finish approval",
                    })}><CheckCircle2 size={18} /> Close &amp; finish approval</Button>
                  </>
                ) : (
                  <Button disabled={busy} onClick={() => act("approve", {}, "Order approved", {
                    title: "Approve the whole order?",
                    message: "Every kitchen's items are approved and the order closes, so no kitchen can add or change anything.",
                    confirmLabel: "Approve all",
                  })}><CheckCircle2 size={18} /> Approve all</Button>
                ))}
                {canDispatchAll(order) && (
                  <Button disabled={busy} onClick={() => act("dispatch", {}, "Everything dispatched", {
                    title: "Dispatch everything that is left?",
                    message: "Every kitchen's items that have not been sent yet are marked as on the way.",
                    confirmLabel: "Dispatch all",
                  })}><Truck size={18} /> Dispatch all</Button>
                )}
                {canMarkOrdered(order) && !purchase.supplierId && (
                  <span style={{ alignSelf: "center", color: "var(--muted)", fontSize: 13 }}>Choose a supplier above to mark as ordered.</span>
                )}
                {canMarkOrdered(order) && (
                  <Button disabled={busy || !purchase.supplierId} onClick={() => act("status", { status: "ordered", supplierId: purchase.supplierId }, "Marked as ordered", {
                    title: "Mark as ordered?",
                    message: `Placed with ${suppliers.find((s) => s._id === purchase.supplierId)?.name || "the chosen supplier"}. Kitchens will see it as Ordered.`,
                    confirmLabel: "Mark as ordered",
                  })}><ShoppingCart size={18} /> Mark as ordered</Button>
                )}
              </div>
            }
          >
            {order.status === "cancelled" && order.cancellationReason && (
              <Banner variant="warn" style={{ marginBottom: 12 }}>Cancelled: {order.cancellationReason}</Banner>
            )}
            {order.note && <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted)" }}>Order note: {order.note}</p>}
            {canSetPurchaseDetails(order) && (
              <Card tight style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
                  <Field label="Supplier" className="field--grow">
                    <Select value={purchase.supplierId} placeholder="Choose a supplier" onChange={(e) => setPurchase({ supplierId: e.target.value })}>
                      {order.status !== "ordered" && <option value="">Choose a supplier</option>}
                      {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
                      {order.supplier && !suppliers.some((s) => s._id === order.supplier._id) && <option value={order.supplier._id}>{order.supplier.name} (archived)</option>}
                    </Select>
                  </Field>
                  <Field label="Invoice number" className="field--grow">
                    <input type="text" value={purchase.invoiceNo} maxLength={60} placeholder="After payment" onChange={(e) => setPurchase({ invoiceNo: e.target.value })} />
                  </Field>
                  <Button variant="ghost" disabled={busy || !purchaseDirty}
                    onClick={() => act("purchase", {
                      supplierId: purchase.supplierId || null, invoiceNo: purchase.invoiceNo,
                      expiryDates: (order.combinedItems || []).map((line) => ({ stockItemId: productIdOf(line), expiryDate: purchase.expiry[productIdOf(line)] || null })),
                      supplierOverrides: (order.combinedItems || []).map((line) => ({ stockItemId: productIdOf(line), supplierId: purchase.overrides[productIdOf(line)] || null })),
                    }, "Purchase details saved")}>
                    <Save size={16} /> Save
                  </Button>
                </div>
                <table className="table" style={{ marginTop: 12 }}>
                  <thead><tr><th scope="col">Item</th><th scope="col">Bought from</th><th scope="col">Expiry (bulk buys)</th></tr></thead>
                  <tbody>
                    {(order.combinedItems || []).map((line) => {
                      const productId = productIdOf(line);
                      return (
                        <tr key={productId}>
                          <td style={{ fontWeight: 650 }}>{line.stockItemId?.name || "Item"}</td>
                          <td>
                            <Select value={purchase.overrides[productId] || ""} placeholder="Same as order" onChange={(e) => setPurchase({ overrides: { ...purchase.overrides, [productId]: e.target.value } })}>
                              <option value="">Same as order</option>
                              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
                            </Select>
                          </td>
                          <td>
                            <DateField value={purchase.expiry[productId] || ""} placeholder="Optional"
                              onChange={(e) => setPurchase({ expiry: { ...purchase.expiry, [productId]: e.target.value } })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  {order.supplier ? `Kitchens see ${order.supplier.name}, FSSAI licence ${order.supplier.fssaiLicence}` : "Kitchens see the supplier's name and FSSAI licence on the delivery"}{order.invoiceNo ? ` and invoice ${order.invoiceNo}.` : "."}
                </p>
              </Card>
            )}
            {order.contributions.map((share) => {
              const kitchenId = share.godownId?._id || share.godownId;
              const stage = shareStage(order, share);
              const placed = order.status === "ordered";
              return (
                <Card key={share._id || kitchenId} tight style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div>
                      <strong>{share.godownId?.name || "Kitchen"}</strong>{" "}
                      <Badge variant={STAGE_VARIANT[stage]}>{stage}</Badge>
                      {share.note && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Note: {share.note}</div>}
                      {share.rejectedAt && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Rest not approved: {share.rejectionReason}</div>}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {canRejectShare(order, share) && (
                        <Button size="sm" variant="ghost" disabled={busy}
                          onClick={() => askReason("reject", { godownId: kitchenId }, `Reject ${share.godownId?.name || "this kitchen"}'s remaining items?`, "Reject", `${share.godownId?.name || "Kitchen"} rejected`)}>
                          Reject kitchen
                        </Button>
                      )}
                      {approvable && !share.approvedAt && !share.rejectedAt && (
                        <Button size="sm" variant="ghost" disabled={busy}
                          onClick={() => act("approve", { godownId: kitchenId }, `${share.godownId?.name || "Kitchen"} approved`)}>
                          Approve kitchen
                        </Button>
                      )}
                      {canDispatch(order, share) && (
                        <Button size="sm" disabled={busy} onClick={() => act("dispatch", { godownId: kitchenId }, `Dispatched to ${share.godownId?.name || "the kitchen"}`, {
                          title: `Dispatch to ${share.godownId?.name || "this kitchen"}?`,
                          message: "Its items that have not been sent yet are marked as on the way; the kitchen confirms when they arrive.",
                          confirmLabel: "Dispatch",
                        })}><Truck size={16} /> {stage === "Partly dispatched" || stage === "Partly received" ? "Dispatch the rest" : "Dispatch kitchen"}</Button>
                      )}
                    </div>
                  </div>
                  <table className="table">
                    <thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col" style={{ textAlign: "right" }}>{placed ? "Delivery" : "Approval"}</th></tr></thead>
                    <tbody>
                      {share.items.map((line) => {
                        const productId = line.stockItemId?._id || line.stockItemId;
                        const pick = { godownId: kitchenId, items: [{ stockItemId: productId, packId: line.packId || undefined }] };
                        const name = line.stockItemId?.name || "Item";
                        return (
                          <tr key={`${productId}:${line.packId || "base"}`}>
                            <td>
                              {name}
                              {line.rejectedAt && line.rejectionReason && <div style={{ fontSize: 12, color: "var(--muted)" }}>{line.rejectionReason}</div>}
                            </td>
                            <td>
                              {lineLabel(line)}
                              {requestedLabel(line) && <div style={{ fontSize: 12, color: "var(--muted)" }}>Kitchen requested {requestedLabel(line)}</div>}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {placed ? (
                                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                  <Badge variant={DELIVERY_VARIANT[lineDelivery(line, share)]}>{lineDelivery(line, share)}</Badge>
                                  {canDispatchLine(order, line, share) && (
                                    <Button size="sm" variant="ghost" disabled={busy}
                                      onClick={() => act("dispatch", { godownId: kitchenId, items: [{ stockItemId: productId, packId: line.packId || undefined }] }, `${line.stockItemId?.name || "Item"} dispatched`)}>
                                      Dispatch
                                    </Button>
                                  )}
                                </span>
                              ) : line.rejectedAt ? <Badge variant="neutral">Not approved</Badge> : approvable ? (
                                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                  {line.approvedAt && <Badge variant="success">Approved</Badge>}
                                  {canAdjustLine(order, line) && (
                                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => {
                                      const editable = editableQuantity(line);
                                      setAdjusting({ godownId: kitchenId, stockItemId: productId, packId: line.packId || null, name, quantity: String(editable.value), unit: editable.unit });
                                    }}>
                                      <Pencil size={14} /> Change quantity
                                    </Button>
                                  )}
                                  {canRejectLine(order, line) && (
                                    <Button size="sm" variant="ghost" disabled={busy}
                                      onClick={() => askReason("reject", pick, `Reject ${name}?`, "Reject", `${name} rejected`)}>
                                      Reject
                                    </Button>
                                  )}
                                  {!line.approvedAt && <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("approve", pick, `${name} approved`)}>Approve</Button>}
                                </span>
                              ) : line.approvedAt ? <Badge variant="success">Approved</Badge> : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              );
            })}
            <h3 style={{ fontSize: 14, margin: "16px 0 8px" }}>To buy (all kitchens)</h3>
            <table className="table">
              <thead><tr><th scope="col">Item</th><th scope="col" style={{ textAlign: "right" }}>Total</th></tr></thead>
              <tbody>
                {(order.combinedItems || []).map((line) => (
                  <tr key={line.stockItemId?._id || line.stockItemId}>
                    <td>{line.stockItemId?.name || "Item"}</td>
                    <td style={{ textAlign: "right", fontWeight: 650 }}>{lineLabel(line)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(order.events || []).length > 0 && (
              <>
                <h3 style={{ fontSize: 14, margin: "16px 0 8px" }}>History</h3>
                <table className="table">
                  <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What happened</th></tr></thead>
                  <tbody>
                    {[...order.events].reverse().map((event, index) => (
                      <tr key={`${event.at}:${event.action}:${index}`}>
                        <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{when(event.at, true)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{eventActor(event)}</td>
                        <td>{eventText(event)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </DetailPanel>
        ) : (
          <EmptyState title={loading ? "Loading…" : "Select an order"}>Choose a shared order on the left.</EmptyState>
        )}
      </SplitView>
      {dialog}
      {raiseDialog}
      {rejecting && (
        <Modal title={rejecting.title} onClose={() => !busy && setRejecting(null)} actions={(
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setRejecting(null)}>Back</Button>
            <Button variant="danger" disabled={busy || !rejecting.note.trim()} onClick={sendRejection}>{rejecting.confirmLabel}</Button>
          </>
        )}>
          <Field label="Reason the kitchen will see">
            <textarea rows={3} value={rejecting.note} maxLength={500} onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })} />
          </Field>
          <p className="confirm-message" style={{ marginTop: 10 }}>
            {rejecting.path === "status" ? "No kitchen can add to or change this order afterwards." : "This cannot be undone. The kitchen can ask for these items again on a new order."}
          </p>
        </Modal>
      )}
      {adjusting && (
        <Modal title={`Change ${adjusting.name} quantity`} onClose={() => !busy && setAdjusting(null)} actions={(
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setAdjusting(null)}>Back</Button>
            <Button disabled={busy || !(Number(adjusting.quantity) > 0)} onClick={sendAdjustment}>Change &amp; approve</Button>
          </>
        )}>
          <Field label={`Quantity (${adjusting.unit || "base unit"})`}>
            <input type="number" min="0.001" step="any" value={adjusting.quantity} autoFocus
              onChange={(event) => setAdjusting({ ...adjusting, quantity: event.target.value })} />
          </Field>
          <p className="confirm-message" style={{ marginTop: 10 }}>
            The kitchen will see both its original request and the changed quantity. Changing it also approves this item.
          </p>
        </Modal>
      )}
    </>
  );
}
