import { useCallback, useState } from "react";
import { Boxes, Clock, Layers, Ruler } from "lucide-react";
import { api } from "../api.js";
import { PageHeader, Tabs } from "../components/ui/index.jsx";
import { useConfirm } from "../components/ui/useConfirm.jsx";
import { SettingsList } from "./settings/SettingsList.jsx";
import { OrderingRules } from "./settings/OrderingRules.jsx";
import "./InventorySetup.css";
import "./settings/settings.css";

// Settings (super-admin only): the lists the rest of the app is built on. Anything added here shows in the product form,
// the kitchen app and the next Excel template's dropdowns.
const TABS = [
  { value: "units", label: "Units", icon: <Ruler size={14} />,
    hint: "What a product is counted in, e.g. kg, L or bunch. Kitchens always record a product in its own unit, with no conversion. The 7 built-in units stay; a unit you add can be removed only while no product uses it." },
  { value: "packs", label: "Pack names", icon: <Boxes size={14} />,
    hint: "How the store buys a product, e.g. Bag or Tin. A product still counts in its own unit; the pack only says how much comes in one. Removing a name takes that pack off every product that has it." },
  { value: "groups", label: "Product groups", icon: <Layers size={14} />,
    hint: "How products are sorted in the kitchen's stock list and in reports. “Other” is always there. A group can be removed only when no product is in it." },
  { value: "ordering", label: "Ordering rules", icon: <Clock size={14} />,
    hint: "The timings behind shared kitchen orders: when kitchens can say they need something, and how long other kitchens can join an order." }
];
const plural = (n, word) => (n === 1 ? `1 ${word}` : `${n} ${word}s`);
const usedBy = (n) => (n ? `used by ${plural(n, "product")}` : "not used yet");

export function SettingsPage() {
  const [tab, setTab] = useState("units");
  const { confirm, dialog } = useConfirm();
  const current = TABS.find((t) => t.value === tab);

  const loadUnits = useCallback(async () => (await api.get("/products/units")).data.map((u) => ({
    id: u._id, title: u.name.toLowerCase() === u.symbol.toLowerCase() ? u.name : `${u.name} (${u.symbol})`, sub: usedBy(u.productCount),
    pill: u.builtIn ? "Built in" : null, canDelete: !u.builtIn && !u.productCount, raw: u
  })), []);
  const loadPacks = useCallback(async () => (await api.get("/products/pack-names")).data.map((p) => ({
    id: p.name, title: p.name, sub: p.builtIn ? null : usedBy(p.productCount), pill: p.builtIn ? "Built in" : null, canDelete: !p.builtIn, raw: p
  })), []);
  const loadGroups = useCallback(async () => (await api.get("/inventory/stock-groups")).data.map((g) => {
    const other = g.name.trim().toLowerCase() === "other";
    return { id: g._id, title: g.name, sub: usedBy(g.productCount), pill: other ? "Built in" : null, canRename: !other, canDelete: !other && !g.productCount, raw: g };
  }), []);

  const removeUnit = async (row) => {
    if (!(await confirm({ title: `Remove “${row.title}”?`, message: "No product uses it. It leaves the unit list and the next Excel template.", confirmLabel: "Remove", variant: "danger" }))) return false;
    await api.delete(`/products/units/${row.id}`);
    return true;
  };
  const removePack = async (row) => {
    const { data } = await api.get("/products/pack-types/usage", { params: { name: row.title } });
    const products = data.products || [];
    const left = products.filter((p) => p.disabled).length;
    const ok = await confirm({
      title: `Remove pack name “${row.title}”?`,
      message: products.length === 0
        ? "No product uses it. It leaves the list and the next Excel template."
        : `Its pack is taken off ${plural(products.length, "product")}: ${products.map((p) => p.name).join(", ")}.${left ? ` ${left === 1 ? "One of them has" : `${left} of them have`} no other pack and will be hidden from kitchens until a pack is added.` : ""} Past orders keep their own copy.`,
      confirmLabel: "Remove", variant: "danger"
    });
    if (!ok) return false;
    await api.post("/products/pack-types/remove", { name: row.title });
    return true;
  };
  const removeGroup = async (row) => {
    if (!(await confirm({ title: `Remove group “${row.title}”?`, message: "No product is in it. It just leaves the list.", confirmLabel: "Remove", variant: "danger" }))) return false;
    await api.delete(`/inventory/stock-groups/${row.id}`);
    return true;
  };

  return (
    <div className="setup-shell">
      <PageHeader title="Settings" subtitle="The lists the app is built on. What you add here shows in the product form, the kitchen app and the next Excel template." />
      <div className="setup-page">
        <Tabs label="Settings sections" items={TABS} value={tab} onChange={setTab} />
        <p className="setup-hint">{current.hint}</p>
        {tab === "units" && (
          <SettingsList key="units" label="Units" singular="Unit" load={loadUnits} onDelete={removeUnit}
            addFields={[{ key: "symbol", placeholder: "Short form, e.g. bunch", maxLength: 12, required: true, narrow: true }, { key: "name", placeholder: "Full name, e.g. Bunch", maxLength: 30, required: true }]}
            onAdd={(v) => api.post("/products/units", v)} />
        )}
        {tab === "packs" && (
          <SettingsList key="packs" label="Pack names" singular="Pack name" load={loadPacks} onDelete={removePack}
            addFields={[{ key: "name", placeholder: "New pack name, e.g. Sack", maxLength: 40, required: true }]}
            onAdd={(v) => api.post("/products/pack-names", v)} />
        )}
        {tab === "groups" && (
          <SettingsList key="groups" label="Product groups" singular="Group" load={loadGroups} onDelete={removeGroup}
            onRename={(row, name) => api.put(`/inventory/stock-groups/${row.id}`, { name })}
            addFields={[{ key: "name", placeholder: "New group name, e.g. Spices", maxLength: 60, required: true }]}
            onAdd={(v) => api.post("/inventory/stock-groups", v)} />
        )}
        {tab === "ordering" && <OrderingRules />}
      </div>
      {dialog}
    </div>
  );
}
