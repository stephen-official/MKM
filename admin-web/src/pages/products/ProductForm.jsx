import { useRef, useState } from "react";
import { Camera, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api.js";
import { Button, Field, Modal, Select } from "../../components/ui/index.jsx";
import { useConfirm } from "../../components/ui/useConfirm.jsx";
import { ALLERGENS, ALLERGEN_ANSWERS, PRODUCT_FORMS, PRODUCT_KINDS, STORAGE_OPTIONS, VEG_MARKS, toggleAllergen } from "./foodSafety.js";
import { PACK_TYPES, capitalizeFirst, formatPrice, hasMoreDetails, isPresetPackName, newPack, unitPriceFromPack, validateProductForm } from "./productForm.js";
import { PackNameSelect } from "./PackNameSelect.jsx";

/** A row of choice chips: one answer (or several when `multiple`). */
function Choices({ options, value, onChange, onToggle, multiple = false, label, invalid, columns = 0 }) {
  const chosen = (option) => (multiple ? value.includes(option.value) : value === option.value);
  const pick = (option) => {
    if (!multiple) return onChange(option.value);
    if (onToggle) return onToggle(option.value); // the owner works out the next list from its own latest state
    onChange(chosen(option) ? value.filter((v) => v !== option.value) : [...value, option.value]);
  };
  return (
    <div className={`choices${invalid ? " choices--invalid" : ""}${columns ? ` choices--grid choices--${columns}` : ""}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button type="button" key={option.value} className={chosen(option) ? "choice is-on" : "choice"} aria-pressed={chosen(option)} title={option.hint} onClick={() => pick(option)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/**
 * Add / edit popup for one product: photo and the essentials first, the FSSAI facts, packs as a yes/no question, and the
 * rarely-used details behind a fold. Expiry is not asked: it follows the food answers on the server (packaged food only).
 * `canPrice` is true for a super-admin; anyone else sees prices read-only. `serverErrors` mirror validateProductForm's.
 * `knownPackNames` are pack names already saved on products; `onPackTypeRemoved` runs after one is deleted everywhere.
 * Groups are added and (when empty) deleted right here; `onGroupsChanged()` reloads `groups` and resolves when done.
 */
export function ProductForm({ title, initial, units, groups, onGroupsChanged, canPrice, knownPackNames = [], onPackTypeRemoved, busy, serverErrors = {}, notice, submitLabel = "Save product", onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [typing, setTyping] = useState(() => new Set()); // pack rows where a new name is being typed ("Other…")
  const [dropped, setDropped] = useState([]); // custom names deleted while this form is open
  const [packNotice, setPackNotice] = useState(""); // a failed delete of a pack name
  const [newGroup, setNewGroup] = useState(null); // the group name being typed ("New group…"), null when picking from the list
  const [groupNotice, setGroupNotice] = useState(""); // a failed add or delete of a group
  const groupBusy = useRef(false); // Enter then blur must not add the same group twice
  const { confirm, dialog } = useConfirm();
  const fileRef = useRef(null);
  const errors = { ...serverErrors, ...localErrors };
  const unit = units.find((u) => u._id === form.unitId);
  const unitLabel = unit?.symbol || "unit";

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setPack = (key, patch) => setForm((prev) => ({ ...prev, packs: prev.packs.map((pack) => (pack.key === key ? { ...pack, ...patch } : pack)) }));
  const setSoldInPacks = (yes) => set({ soldInPacks: yes, packs: yes && form.packs.length === 0 ? [newPack()] : form.packs });
  // None and Not sure stand alone; a specific allergen clears them (foodSafety.js). Read the latest list, so quick taps never lose one.
  const tapAllergen = (value) => setForm((prev) => ({ ...prev, allergens: toggleAllergen(prev.allergens, value) }));

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const { data } = await api.post("/products/upload-image", body);
      set({ imageUrl: data.imageUrl });
      setLocalErrors((prev) => { const next = { ...prev }; delete next.imageUrl; return next; });
    } catch (error) {
      setUploadError(error.response?.data?.message || "The photo could not be uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateProductForm(form, { canPrice });
    setLocalErrors(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  };

  // Pack names: the built-in ones, then custom names (saved on products, or typed in this form), minus any deleted here.
  const builtIns = PACK_TYPES.map((t) => t.name);
  const customs = [...new Map([...knownPackNames, ...form.packs.map((p) => p.name)]
    .map((n) => capitalizeFirst(String(n || "").trim()))
    .filter((n) => n && !isPresetPackName(n) && !dropped.some((d) => sameName(d, n)))
    .map((n) => [n.toLowerCase(), n])).values()];
  const startTyping = (key, on) => setTyping((prev) => { const next = new Set(prev); if (on) next.add(key); else next.delete(key); return next; });
  // Leaving the typed name: a name is kept (it now shows in the list); an empty box goes back to the list unchosen.
  const finishTyping = (pack) => {
    const name = capitalizeFirst(pack.name.trim());
    const match = [...builtIns, ...customs].find((n) => sameName(n, name));
    setPack(pack.key, { name: match || name });
    startTyping(pack.key, false);
  };
  // Minus beside a custom name: a name only typed in this form just goes; one saved on products is deleted from them, after a check.
  const removeName = async (name) => {
    const saved = knownPackNames.some((n) => sameName(n, name));
    if (saved) {
      let products = [];
      setPackNotice("");
      try {
        ({ data: { products } } = await api.get("/products/pack-types/usage", { params: { name } }));
      } catch (error) {
        return setPackNotice(error.response?.data?.message || "Could not check which products use this name. Try again.");
      }
      const ok = await confirm({
        title: `Delete pack name “${name}”?`,
        message: products.length === 0
          ? "No saved product uses it. It will just leave the list."
          : `It is removed from ${products.length === 1 ? "1 product" : `${products.length} products`}: ${products.map((p) => p.name).join(", ")}. Past orders keep their own copy.`,
        confirmLabel: "Delete name",
        variant: "danger"
      });
      if (!ok) return;
      try {
        await api.post("/products/pack-types/remove", { name });
      } catch (error) {
        return setPackNotice(error.response?.data?.message || "Could not delete the name. Try again.");
      }
      onPackTypeRemoved?.(name);
    }
    setDropped((prev) => [...prev, name]);
    setForm((prev) => ({ ...prev, packs: prev.packs.map((pk) => (sameName(pk.name, name) ? { ...pk, name: "" } : pk)) }));
  };

  // Product group: pick one, type a new one (added at once, so it shows in the list), or delete an empty one with its minus.
  const groupName = groups.find((g) => g._id === form.stockGroupId)?.name || "";
  const groupByName = (name) => groups.find((g) => sameName(g.name, name));
  const isEmptyGroup = (name) => { const g = groupByName(name); return Boolean(g) && !g.productCount && !sameName(g.name, "Other"); };
  const addGroup = async () => {
    if (groupBusy.current || newGroup === null) return;
    const name = capitalizeFirst(newGroup.trim());
    if (!name) return setNewGroup(null);
    const existing = groupByName(name);
    if (existing) { set({ stockGroupId: existing._id }); return setNewGroup(null); }
    groupBusy.current = true;
    setGroupNotice("");
    try {
      const { data: created } = await api.post("/inventory/stock-groups", { name });
      await onGroupsChanged?.();
      set({ stockGroupId: created._id });
      setNewGroup(null);
    } catch (error) {
      setGroupNotice(error.response?.data?.message || "Could not add the group. Try again.");
    } finally {
      groupBusy.current = false;
    }
  };
  const removeGroup = async (name) => {
    const group = groupByName(name);
    if (!group) return;
    const ok = await confirm({ title: `Delete group “${group.name}”?`, message: "No product is in it. It will just leave the list.", confirmLabel: "Delete group", variant: "danger" });
    if (!ok) return;
    setGroupNotice("");
    try {
      await api.delete(`/inventory/stock-groups/${group._id}`);
      if (form.stockGroupId === group._id) set({ stockGroupId: "" });
      await onGroupsChanged?.();
    } catch (error) {
      setGroupNotice(error.response?.data?.message || "Could not delete the group. Try again.");
    }
  };

  const error = (key) => errors[key] && <span className="field__error" role="alert">{errors[key]}</span>;
  const packError = (index, key) => errors.packList?.[index]?.[key] && <span className="field__error" role="alert">{errors.packList[index][key]}</span>;
  const price = (value, onChange, invalid) => canPrice ? (
    <span className="product-input-affix">
      <span aria-hidden="true">₹</span>
      <input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={onChange} aria-invalid={invalid || undefined} />
    </span>
  ) : <span className="product-locked"><Lock size={13} aria-hidden="true" />{formatPrice(Number(value) || null)}</span>;

  return (
    <>
      <Modal title={title} onClose={() => !busy && onCancel()} wide dismissible={false} closeButton actions={(
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" form="product-form" disabled={busy || uploading}>{busy ? "Saving…" : submitLabel}</Button>
        </>
      )}>
        <form id="product-form" className="product-form" onSubmit={submit} noValidate>
          {notice}

          <section className="product-form__section" aria-labelledby="product-basics">
            <h3 id="product-basics">Product</h3>
            <div className="product-form__basics">
              <div className={`product-photo${errors.imageUrl ? " product-photo--missing" : ""}`}>
                <button type="button" className="product-photo__frame" onClick={() => fileRef.current?.click()} disabled={uploading}
                  aria-label={form.imageUrl ? "Replace the photo" : "Add a photo"}>
                  {uploading ? <Loader2 size={26} className="animate-spin" aria-hidden="true" />
                    : form.imageUrl ? <img src={form.imageUrl} alt="" />
                      : <span className="product-photo__empty"><Camera size={26} aria-hidden="true" />Add photo</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={upload} hidden aria-label="Product photo" />
                {form.imageUrl && !uploading && <button type="button" className="product-photo__change" onClick={() => fileRef.current?.click()}>Change photo</button>}
                {(uploadError || errors.imageUrl) && <span className="field__error" role="alert">{uploadError || errors.imageUrl}</span>}
              </div>
              <div className="product-form__grid">
                <Field label="Name" className="product-form__wide">
                  <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} aria-invalid={Boolean(errors.name) || undefined} autoFocus />
                  {error("name")}
                </Field>
                {/* A div, not Field's <label>: the picker holds several buttons. */}
                <div className="field">
                  <span className="field__label">Product group</span>
                  {newGroup !== null ? (
                    <span className="product-pack__typing">
                      <input value={newGroup} placeholder="Type the group, e.g. Spices" aria-label="New group name" autoFocus maxLength={60}
                        onChange={(e) => setNewGroup(e.target.value)}
                        onBlur={addGroup}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGroup(); } }} />
                      <button type="button" aria-label="Back to the list" onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setNewGroup(null); setGroupNotice(""); }}><X size={15} aria-hidden="true" /></button>
                    </span>
                  ) : (
                    <PackNameSelect id="product-group" value={groupName} builtIns={[]} customs={groups.map((g) => g.name)}
                      customsLabel="" otherLabel="New group… type a name" removeLabel="Delete group" canRemove={isEmptyGroup}
                      invalid={Boolean(errors.stockGroupId)}
                      onPick={(name) => set({ stockGroupId: groupByName(name)?._id || "" })}
                      onOther={() => { setNewGroup(""); setGroupNotice(""); }}
                      onRemove={removeGroup} />
                  )}
                  {error("stockGroupId")}
                  {groupNotice && <span className="field__error" role="alert">{groupNotice}</span>}
                </div>
                <Field label="Counted in">
                  <Select value={form.unitId} onChange={(e) => set({ unitId: e.target.value })}>
                    <option value="">Choose…</option>
                    {units.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.symbol})</option>)}
                  </Select>
                  {error("unitId")}
                  {form.legacyUnit && !form.unitId && <small className="product-form__hint">Was “{form.legacyUnit}”, which is not a preset. Choose the matching unit.</small>}
                </Field>
                <Field label={`Price per ${unitLabel}`} className="product-form__wide">
                  {price(form.pricePerUnit, (e) => set({ pricePerUnit: e.target.value }), Boolean(errors.pricePerUnit))}
                  {error("pricePerUnit")}
                  {!canPrice && <small className="product-form__hint">Set by a super-admin. Until then the product is hidden from kitchens.</small>}
                </Field>
              </div>
            </div>
          </section>

          <section className="product-form__section" aria-labelledby="product-safety">
            <h3 id="product-safety">Food safety (FSSAI)</h3>
            <div className="product-form__grid">
              <Field label="Is this food?">
                <Choices label="Is this food?" options={PRODUCT_KINDS} value={form.kind} invalid={Boolean(errors.kind)} onChange={(kind) => set({ kind })} />
                {error("kind")}
              </Field>
              {form.kind === "food" ? (
                <Field label="How it arrives (optional)">
                  <Choices label="How it arrives" options={PRODUCT_FORMS} value={form.form} onChange={(next) => set({ form: form.form === next ? "" : next })} />
                  {error("form")}
                </Field>
              ) : <div className="field" aria-hidden="true"><span className="field__label">&nbsp;</span>{form.kind === "non_food" && <p className="product-form__hint product-form__hint--inline">Not food, so no FSSAI details are needed.</p>}</div>}
              {form.kind === "food" && (
                <>
                  <Field label="Veg or non-veg">
                    <Choices label="Veg or non-veg" options={VEG_MARKS} value={form.vegMark} invalid={Boolean(errors.vegMark)} onChange={(vegMark) => set({ vegMark })} />
                    {error("vegMark")}
                  </Field>
                  <Field label="Kept in">
                    <Choices label="Kept in" options={STORAGE_OPTIONS} value={form.storage} invalid={Boolean(errors.storage)} onChange={(storage) => set({ storage })} />
                    {error("storage")}
                  </Field>
                  <Field label="Contains allergens (tick all that apply)" className="product-form__wide">
                    <Choices label="Allergens" multiple columns={3} options={ALLERGENS} value={form.allergens} invalid={Boolean(errors.allergens)} onToggle={tapAllergen} />
                    <Choices label="No allergens, or not sure" multiple columns={2} options={ALLERGEN_ANSWERS} value={form.allergens} invalid={Boolean(errors.allergens)} onToggle={tapAllergen} />
                    {error("allergens")}
                  </Field>
                </>
              )}
            </div>
          </section>

          <section className="product-form__section" aria-labelledby="product-packs">
            <h3 id="product-packs">Bought in bags, tins, boxes or packets?</h3>
            <Choices label="Bought in packs" columns={2} options={[{ value: true, label: "Yes" }, { value: false, label: "No, by the kg or piece" }]} value={form.soldInPacks} onChange={setSoldInPacks} />
            {form.soldInPacks && (
              <div className="product-packs">
                <div className="product-pack product-pack--head" aria-hidden="true">
                  <span>Pack</span><span>One pack holds</span><span>Pack price</span><span />
                </div>
                {form.packs.map((pack, index) => {
                  const implied = unitPriceFromPack(pack);
                  return (
                    <fieldset className="product-pack" key={pack.key}>
                      <legend className="sr-only">Pack {index + 1}</legend>
                      <div className="product-pack__cell">
                        <span className="product-pack__label">Pack</span>
                        {typing.has(pack.key) ? (
                          <span className="product-pack__typing">
                            <input value={pack.name} placeholder="Type the name, e.g. Sack" aria-label="New pack name" autoFocus maxLength={40}
                              onChange={(e) => setPack(pack.key, { name: e.target.value })}
                              onBlur={() => finishTyping(pack)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); finishTyping(pack); } }} />
                            <button type="button" aria-label="Back to the list" onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setPack(pack.key, { name: "" }); startTyping(pack.key, false); }}><X size={15} aria-hidden="true" /></button>
                          </span>
                        ) : (
                          <PackNameSelect id={`pack-name-${pack.key}`} value={pack.name} builtIns={builtIns} customs={customs}
                            invalid={Boolean(errors.packList?.[index]?.name)}
                            onPick={(name) => setPack(pack.key, { name })}
                            onOther={() => { setPack(pack.key, { name: "" }); startTyping(pack.key, true); }}
                            onRemove={removeName} />
                        )}
                        {packError(index, "name")}
                      </div>
                      <div className="product-pack__cell">
                        <span className="product-pack__label">One pack holds</span>
                        <span className="product-input-affix product-input-affix--end">
                          <input type="number" min="0" step="any" inputMode="decimal" value={pack.size} aria-label="One pack holds" onChange={(e) => setPack(pack.key, { size: e.target.value })} />
                          <span aria-hidden="true">{unitLabel}</span>
                        </span>
                        {packError(index, "size")}
                      </div>
                      <div className="product-pack__cell">
                        <span className="product-pack__label">Pack price</span>
                        {price(pack.price, (e) => setPack(pack.key, { price: e.target.value }), Boolean(errors.packList?.[index]?.price))}
                        {packError(index, "price")}
                        {implied !== null && <small className="product-form__hint">{formatPrice(implied)} per {unitLabel}</small>}
                      </div>
                      <button type="button" className="product-pack__remove" onClick={() => set({ packs: form.packs.filter((p) => p.key !== pack.key) })} aria-label={`Remove pack ${pack.name || index + 1}`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </fieldset>
                  );
                })}
                {error("packs")}
                {packNotice && <span className="field__error" role="alert">{packNotice}</span>}
                <button type="button" className="product-packs__add" onClick={() => set({ packs: [...form.packs, newPack()] })}><Plus size={15} aria-hidden="true" /> Add another pack</button>
                {!canPrice && <p className="product-form__hint">Changing a pack’s size clears its price until a super-admin sets it again.</p>}
              </div>
            )}
          </section>

          <details className="product-form__more" open={hasMoreDetails(initial) || undefined}>
            <summary>
              <span className="product-form__more-mark" aria-hidden="true" />
              <span className="product-form__more-text">More details<small>Brand, product code, low-stock warning, daily-use item</small></span>
            </summary>
            <div className="product-form__grid">
              <Field label="Brand">
                <input value={form.brand} onChange={(e) => set({ brand: e.target.value })} maxLength={80} />
                {error("brand")}
              </Field>
              <Field label="Product code">
                <input value={form.productCode} onChange={(e) => set({ productCode: e.target.value })} maxLength={40} />
                {error("productCode")}
              </Field>
              <Field label="Warn the kitchen when below">
                <span className="product-input-affix product-input-affix--end">
                  <input type="number" min="0" step="any" inputMode="decimal" value={form.defaultThreshold} onChange={(e) => set({ defaultThreshold: e.target.value })} />
                  <span aria-hidden="true">{unitLabel}</span>
                </span>
                {error("defaultThreshold")}
              </Field>
              <label className="checkbox product-form__checkbox-cell">
                <input type="checkbox" checked={form.itemType === "daily_use"} onChange={(e) => set({ itemType: e.target.checked ? "daily_use" : "stock" })} />
                <span>Daily-use item<small className="product-form__hint">Used up as it comes in, such as milk or bread.</small></span>
              </label>
            </div>
          </details>
        </form>
      </Modal>
      {/* After the form, so a confirm box sits above it. */}
      {dialog}
    </>
  );
}
