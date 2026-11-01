import { useRef, useState } from "react";
import { ImagePlus, Loader2, Lock, Package, Plus, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import { Button, Field, Modal, Select } from "../../components/ui/index.jsx";
import { ALLERGENS, PRODUCT_FORMS, PRODUCT_KINDS, STORAGE_OPTIONS, VEG_MARKS } from "./foodSafety.js";
import { PACK_TYPES, formatPrice, hasMoreDetails, isPresetPackName, newPack, unitPriceFromPack, validateProductForm } from "./productForm.js";

const OTHER = "__other";

/** A row of choice chips: one answer (or several when `multiple`). */
function Choices({ options, value, onChange, multiple = false, label, invalid }) {
  const chosen = (option) => (multiple ? value.includes(option.value) : value === option.value);
  const pick = (option) => {
    if (!multiple) return onChange(option.value);
    onChange(chosen(option) ? value.filter((v) => v !== option.value) : [...value, option.value]);
  };
  return (
    <div className={`choices${invalid ? " choices--invalid" : ""}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button type="button" key={option.value} className={chosen(option) ? "choice is-on" : "choice"} aria-pressed={chosen(option)} title={option.hint} onClick={() => pick(option)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Add / edit popup for one product: what the kitchens need first, the FSSAI facts, packs as a yes/no question, and the
 * rarely-used details behind a fold. `canPrice` is true for a super-admin; anyone else sees prices read-only.
 * `serverErrors` are the field errors the API returned, in the same shape as validateProductForm's.
 */
export function ProductForm({ title, initial, units, groups, canPrice, knownPackNames = [], busy, serverErrors = {}, notice, submitLabel = "Save product", onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [otherKeys, setOtherKeys] = useState(() => new Set()); // pack rows where "Other…" is chosen and a name is being typed
  const fileRef = useRef(null);
  const errors = { ...serverErrors, ...localErrors };
  const unit = units.find((u) => u._id === form.unitId);
  const unitLabel = unit?.symbol || "unit";

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setPack = (key, patch) => set({ packs: form.packs.map((pack) => (pack.key === key ? { ...pack, ...patch } : pack)) });
  const setSoldInPacks = (yes) => set({ soldInPacks: yes, packs: yes && form.packs.length === 0 ? [newPack()] : form.packs });

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

  // Pack names on offer: the built-in ones, then any custom name already used on a product, then "Other…".
  const customNames = [...new Set([...knownPackNames, ...form.packs.map((p) => p.name)].map((n) => (n || "").trim()).filter((n) => n && !isPresetPackName(n)))];
  const packOptions = [...PACK_TYPES.map((t) => t.name), ...customNames];
  const packChoice = (pack) => (otherKeys.has(pack.key) ? OTHER : packOptions.find((n) => n.toLowerCase() === pack.name.trim().toLowerCase()) || "");
  const choosePack = (pack, value) => {
    setOtherKeys((prev) => { const next = new Set(prev); if (value === OTHER) next.add(pack.key); else next.delete(pack.key); return next; });
    setPack(pack.key, { name: value === OTHER ? "" : value });
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
    <Modal title={title} onClose={() => !busy && onCancel()} wide actions={(
      <>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" form="product-form" disabled={busy || uploading}>{busy ? "Saving…" : submitLabel}</Button>
      </>
    )}>
      <form id="product-form" className="product-form" onSubmit={submit} noValidate>
        {notice}

        <section className="product-form__section" aria-labelledby="product-basics">
          <h3 id="product-basics">Product</h3>
          <div className="product-form__grid">
            <Field label="Name" className="product-form__wide">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} aria-invalid={Boolean(errors.name) || undefined} autoFocus />
              {error("name")}
            </Field>
            <Field label="Product group">
              <Select value={form.stockGroupId} onChange={(e) => set({ stockGroupId: e.target.value })}>
                <option value="">Choose…</option>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
              </Select>
              {error("stockGroupId")}
            </Field>
            <Field label="Counted in">
              <Select value={form.unitId} onChange={(e) => set({ unitId: e.target.value })}>
                <option value="">Choose…</option>
                {units.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.symbol})</option>)}
              </Select>
              {error("unitId")}
              {form.legacyUnit && !form.unitId && <small className="product-form__hint">Was “{form.legacyUnit}”, which is not a preset. Choose the matching unit.</small>}
            </Field>
            <Field label={`Price per ${unitLabel}`}>
              {price(form.pricePerUnit, (e) => set({ pricePerUnit: e.target.value }), Boolean(errors.pricePerUnit))}
              {error("pricePerUnit")}
              {!canPrice && <small className="product-form__hint">Set by a super-admin. Until then the product is hidden from kitchens.</small>}
            </Field>
          </div>
        </section>

        <section className="product-form__section" aria-labelledby="product-safety">
          <h3 id="product-safety">Food safety (FSSAI)</h3>
          <Field label="Is this food?">
            <Choices label="Is this food?" options={PRODUCT_KINDS} value={form.kind} invalid={Boolean(errors.kind)} onChange={(kind) => set({ kind })} />
            {error("kind")}
          </Field>
          {form.kind === "food" && (
            <div className="product-form__grid">
              <Field label="Veg or non-veg">
                <Choices label="Veg or non-veg" options={VEG_MARKS} value={form.vegMark} invalid={Boolean(errors.vegMark)} onChange={(vegMark) => set({ vegMark })} />
                {error("vegMark")}
              </Field>
              <Field label="Kept in">
                <Choices label="Kept in" options={STORAGE_OPTIONS} value={form.storage} invalid={Boolean(errors.storage)} onChange={(storage) => set({ storage })} />
                {error("storage")}
              </Field>
              <Field label="How it arrives (optional)">
                <Choices label="How it arrives" options={PRODUCT_FORMS} value={form.form} onChange={(next) => set({ form: form.form === next ? "" : next })} />
                {error("form")}
              </Field>
              <Field label="Contains allergens (tick all that apply)" className="product-form__wide">
                <Choices label="Allergens" multiple options={ALLERGENS} value={form.allergens} onChange={(allergens) => set({ allergens })} />
                {error("allergens")}
              </Field>
            </div>
          )}
          {form.kind === "non_food" && <p className="product-form__hint">Not food, so no FSSAI details are needed.</p>}
          <label className="checkbox">
            <input type="checkbox" checked={form.expiryRequired} onChange={(e) => set({ expiryRequired: e.target.checked })} />
            <span>Kitchens must enter an expiry date when receiving<small className="product-form__hint">Untick for items with no expiry date, such as salt or cleaning materials.</small></span>
          </label>
        </section>

        <section className="product-form__section" aria-labelledby="product-packs">
          <h3 id="product-packs">Bought in bags, tins or boxes?</h3>
          <Choices label="Bought in packs" options={[{ value: true, label: "Yes" }, { value: false, label: "No, by the kg or piece" }]} value={form.soldInPacks} onChange={setSoldInPacks} />
          {form.soldInPacks && (
            <div className="product-packs">
              {form.packs.map((pack, index) => {
                const implied = unitPriceFromPack(pack);
                const choice = packChoice(pack);
                return (
                  <fieldset className="product-pack" key={pack.key}>
                    <legend className="sr-only">Pack {index + 1}</legend>
                    <Field label="Pack">
                      <Select value={choice} onChange={(e) => choosePack(pack, e.target.value)} aria-invalid={Boolean(errors.packList?.[index]?.name) || undefined}>
                        <option value="">Choose…</option>
                        {packOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                        <option value={OTHER}>Other…</option>
                      </Select>
                      {choice === OTHER && (
                        <input className="product-pack__other" value={pack.name} placeholder="Name it, e.g. Sack" aria-label="Pack name" autoFocus maxLength={40} onChange={(e) => setPack(pack.key, { name: e.target.value })} />
                      )}
                      {packError(index, "name")}
                    </Field>
                    <Field label="One pack holds">
                      <span className="product-input-affix product-input-affix--end">
                        <input type="number" min="0" step="any" inputMode="decimal" value={pack.size} onChange={(e) => setPack(pack.key, { size: e.target.value })} />
                        <span aria-hidden="true">{unitLabel}</span>
                      </span>
                      {packError(index, "size")}
                    </Field>
                    <Field label="Pack price">
                      {price(pack.price, (e) => setPack(pack.key, { price: e.target.value }), Boolean(errors.packList?.[index]?.price))}
                      {packError(index, "price")}
                      {implied !== null && <small className="product-form__hint">{formatPrice(implied)} per {unitLabel}</small>}
                    </Field>
                    <div className="field product-pack__remove-cell">
                      <span className="field__label" aria-hidden="true">&nbsp;</span>
                      <Button variant="ghost" className="product-pack__remove" onClick={() => set({ packs: form.packs.filter((p) => p.key !== pack.key) })} aria-label={`Remove pack ${pack.name || index + 1}`}>
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  </fieldset>
                );
              })}
              {error("packs")}
              <Button size="sm" variant="ghost" onClick={() => set({ packs: [...form.packs, newPack()] })}><Plus size={14} aria-hidden="true" /> Add another pack</Button>
              {!canPrice && <p className="product-form__hint">Changing a pack’s size clears its price until a super-admin sets it again.</p>}
            </div>
          )}
        </section>

        <details className="product-form__more" open={hasMoreDetails(initial) || undefined}>
          <summary>More details<small>Photo, brand, product code, low-stock warning, daily-use item</small></summary>
          <div className="product-form__basics">
            <div className="product-photo">
              <div className="product-photo__frame">
                {form.imageUrl ? <img src={form.imageUrl} alt="" /> : <Package size={28} aria-hidden="true" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={upload} hidden aria-label="Product photo" />
              <Button size="sm" variant="ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={14} aria-hidden="true" />}
                {uploading ? "Uploading…" : form.imageUrl ? "Replace photo" : "Add photo"}
              </Button>
              {form.imageUrl && !uploading && <Button size="sm" variant="ghost" onClick={() => set({ imageUrl: "" })}>Remove</Button>}
              {uploadError && <span className="field__error" role="alert">{uploadError}</span>}
            </div>
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
              <label className="checkbox product-form__wide">
                <input type="checkbox" checked={form.itemType === "daily_use"} onChange={(e) => set({ itemType: e.target.checked ? "daily_use" : "stock" })} />
                <span>Daily-use item<small className="product-form__hint">Used up as it comes in and not counted as stock, such as milk or bread.</small></span>
              </label>
            </div>
          </div>
        </details>
      </form>
    </Modal>
  );
}
