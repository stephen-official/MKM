import { useRef, useState } from "react";
import { ImagePlus, Loader2, Lock, Package, Plus, Trash2 } from "lucide-react";
import { api } from "../../api.js";
import { Button, Field, Modal, Select } from "../../components/ui/index.jsx";
import { ITEM_TYPES, formatPrice, newPack, unitPriceFromPack, validateProductForm } from "./productForm.js";

/**
 * Add / edit popup for one product. `canPrice` is true for a super-admin; anyone else sees prices read-only.
 * `serverErrors` are the field errors the API returned, in the same shape as validateProductForm's.
 */
export function ProductForm({ title, initial, units, groups, canPrice, busy, serverErrors = {}, notice, submitLabel = "Save product", onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);
  const errors = { ...serverErrors, ...localErrors };
  const unit = units.find((u) => u._id === form.unitId);
  const unitLabel = unit?.symbol || "unit";

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const setPack = (key, patch) => set({ packs: form.packs.map((pack) => (pack.key === key ? { ...pack, ...patch } : pack)) });
  const togglePacks = (checked) => set({ soldInPacks: checked, packs: checked && form.packs.length === 0 ? [newPack()] : form.packs });

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

  const error = (key) => errors[key] && <span className="field__error" role="alert">{errors[key]}</span>;
  const packError = (index, key) => errors.packList?.[index]?.[key] && <span className="field__error" role="alert">{errors.packList[index][key]}</span>;

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
              <Field label="Name" className="product-form__wide">
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} aria-invalid={Boolean(errors.name) || undefined} />
                {error("name")}
              </Field>
              <Field label="Product group">
                <Select value={form.stockGroupId} onChange={(e) => set({ stockGroupId: e.target.value })}>
                  <option value="">Choose…</option>
                  {groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                </Select>
                {error("stockGroupId")}
              </Field>
              <Field label="Type">
                <Select value={form.itemType} onChange={(e) => set({ itemType: e.target.value })}>
                  {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Brand (optional)">
                <input value={form.brand} onChange={(e) => set({ brand: e.target.value })} maxLength={80} />
                {error("brand")}
              </Field>
              <Field label="Product code (optional)">
                <input value={form.productCode} onChange={(e) => set({ productCode: e.target.value })} maxLength={40} />
                {error("productCode")}
              </Field>
            </div>
          </div>
        </section>

        <section className="product-form__section" aria-labelledby="product-pricing">
          <h3 id="product-pricing">Unit, price and stock level</h3>
          <div className="product-form__grid product-form__grid--three">
            <Field label="Unit">
              <Select value={form.unitId} onChange={(e) => set({ unitId: e.target.value })}>
                <option value="">Choose…</option>
                {units.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.symbol})</option>)}
              </Select>
              {error("unitId")}
              {form.legacyUnit && !form.unitId && <small className="product-form__hint">Was “{form.legacyUnit}”, which is not a preset. Choose the matching unit.</small>}
            </Field>
            <Field label={`Price per ${unitLabel}`}>
              {canPrice ? (
                <span className="product-input-affix">
                  <span aria-hidden="true">₹</span>
                  <input type="number" min="0" step="0.01" inputMode="decimal" value={form.pricePerUnit} onChange={(e) => set({ pricePerUnit: e.target.value })} aria-invalid={Boolean(errors.pricePerUnit) || undefined} />
                </span>
              ) : (
                <span className="product-locked"><Lock size={13} aria-hidden="true" />{formatPrice(Number(form.pricePerUnit) || null)}</span>
              )}
              {error("pricePerUnit")}
            </Field>
            <Field label="Low-stock level">
              <span className="product-input-affix product-input-affix--end">
                <input type="number" min="0" step="any" inputMode="decimal" value={form.defaultThreshold} onChange={(e) => set({ defaultThreshold: e.target.value })} />
                <span aria-hidden="true">{unitLabel}</span>
              </span>
              {error("defaultThreshold")}
            </Field>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={form.expiryRequired} onChange={(e) => set({ expiryRequired: e.target.checked })} />
            <span>Kitchens must enter an expiry date when receiving<small className="product-form__hint">Untick for items with no expiry date, such as salt or cleaning materials.</small></span>
          </label>
          {!canPrice && <p className="product-form__hint">Only a super-admin can set prices. A product without a price stays hidden from kitchens.</p>}
          <p className="product-form__hint">Kitchens record quantities in {unit ? `${unit.name.toLowerCase()} (${unit.symbol})` : "this unit"}, with no conversion.</p>
        </section>

        <section className="product-form__section" aria-labelledby="product-packs">
          <h3 id="product-packs">Packs</h3>
          <label className="checkbox">
            <input type="checkbox" checked={form.soldInPacks} onChange={(e) => togglePacks(e.target.checked)} />
            <span>Ordered in packs<small className="product-form__hint">For example, rice bought as 25 kg bags. Packs are used for ordering, distribution and kitchen stock.</small></span>
          </label>
          {form.soldInPacks && (
            <div className="product-packs">
              {form.packs.map((pack, index) => {
                const implied = unitPriceFromPack(pack);
                return (
                  <fieldset className="product-pack" key={pack.key}>
                    <legend className="sr-only">Pack {index + 1}</legend>
                    <Field label="Pack name">
                      <input value={pack.name} placeholder="Bag" onChange={(e) => setPack(pack.key, { name: e.target.value })} maxLength={40} />
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
                      {canPrice ? (
                        <span className="product-input-affix">
                          <span aria-hidden="true">₹</span>
                          <input type="number" min="0" step="0.01" inputMode="decimal" value={pack.price} onChange={(e) => setPack(pack.key, { price: e.target.value })} />
                        </span>
                      ) : (
                        <span className="product-locked"><Lock size={13} aria-hidden="true" />{formatPrice(Number(pack.price) || null)}</span>
                      )}
                      {packError(index, "price")}
                      {implied !== null && <small className="product-form__hint">{formatPrice(implied)} per {unitLabel}</small>}
                    </Field>
                    <Button size="sm" variant="ghost" className="product-pack__remove" onClick={() => set({ packs: form.packs.filter((p) => p.key !== pack.key) })} aria-label={`Remove pack ${pack.name || index + 1}`}>
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </fieldset>
                );
              })}
              {error("packs")}
              <Button size="sm" variant="ghost" onClick={() => set({ packs: [...form.packs, newPack()] })}><Plus size={14} aria-hidden="true" /> Add another pack</Button>
              {!canPrice && <p className="product-form__hint">Changing a pack’s size clears its price until a super-admin sets it again.</p>}
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}
