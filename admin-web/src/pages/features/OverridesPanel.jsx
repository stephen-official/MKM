import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import { Banner, Button, DataTable, EmptyState, Field, Select } from "../../components/ui/index.jsx";
import { useToast } from "../../useToast.js";
import { TRI_STATE, effectivePreview, overrideChanges, toTri } from "./overrides.js";

const TRI_LABEL = { inherit: "Inherit", shown: "Shown", hidden: "Hidden" };

/** scope: "kitchen" | "user". targets: [{ id, label, audience: "admin"|"kitchen", kitchenId? }]; note: optional text under the picker. */
export function OverridesPanel({ scope, targets, note, features, globalFlags, onSaved }) {
  const { showToast } = useToast();
  const [targetId, setTargetId] = useState("");
  const [doc, setDoc] = useState(null);
  const [kitchenDoc, setKitchenDoc] = useState(null);
  const [edits, setEdits] = useState({});
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const target = targets.find((t) => t.id === targetId);
  const audience = target?.audience === "admin" ? "admin" : "kitchen";
  const kitchenId = scope === "user" && audience === "kitchen" ? target?.kitchenId : undefined;
  const keys = useMemo(() => features.filter((f) => f.audiences.includes(audience)), [features, audience]);

  // Depends only on primitives so a re-created `targets` array never retriggers the load.
  useEffect(() => {
    if (!targetId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/features/overrides/${scope}/${targetId}`);
        const kitchen = kitchenId ? (await api.get(`/features/overrides/kitchen/${kitchenId}`)).data : null;
        if (cancelled) return;
        setDoc(data);
        setKitchenDoc(kitchen);
        setEdits({});
        setConflict(false);
      } catch {
        if (!cancelled) showToast("Could not load overrides.", "error");
      }
    })();
    return () => { cancelled = true; };
  }, [scope, targetId, kitchenId, reloadTick, showToast]);

  const changes = doc ? overrideChanges(doc.flags, edits) : {};
  const changeCount = Object.keys(changes).length;

  // The layer being edited as it would be once saved: a null change removes the override.
  const editedLayer = { ...doc?.flags };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete editedLayer[key];
    else editedLayer[key] = value;
  }
  const base = audience === "admin" ? globalFlags : Object.fromEntries(keys.map((f) => [f.key, true]));
  const preview = effectivePreview({
    base,
    kitchen: scope === "kitchen" ? editedLayer : kitchenDoc?.flags,
    user: scope === "user" ? editedLayer : {}
  });

  const selectTarget = (id) => {
    setTargetId(id);
    setDoc(null);
    setKitchenDoc(null);
    setEdits({});
    setConflict(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/features/overrides/${scope}/${targetId}`, { expectedVersion: doc.version, changes });
      setDoc({ flags: data.flags, version: data.version, updatedAt: data.updatedAt });
      setEdits({});
      showToast("Overrides saved.", "success");
      onSaved?.();
    } catch (error) {
      if (error.response?.data?.code === "VERSION_CONFLICT") setConflict(true);
      else showToast(error.response?.data?.message || "Could not save overrides.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overrides">
      <Field label={scope === "kitchen" ? "Kitchen" : "User"}>
        <Select value={targetId} onChange={(e) => selectTarget(e.target.value)}>
          <option value="">Choose…</option>
          {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
      </Field>
      {note && <p className="exec-section__note">{note}</p>}
      {!targetId && <EmptyState title={`Choose a ${scope} to see its overrides`}>Overrides take priority over the general setting.</EmptyState>}
      {conflict && (
        <Banner variant="warn">
          Someone else changed these overrides. <Button size="sm" variant="ghost" onClick={() => setReloadTick((n) => n + 1)}>Reload</Button>
        </Banner>
      )}
      {doc && (
        <>
          <DataTable>
            <thead><tr><th scope="col">Feature</th><th scope="col">Override</th><th scope="col">Result</th></tr></thead>
            <tbody>
              {keys.map((f) => {
                const tri = edits[f.key] ?? toTri(doc.flags[f.key]);
                return (
                  <tr key={f.key}>
                    <th scope="row">{f.label}</th>
                    <td>
                      <Select aria-label={`${f.label} override`} value={tri} disabled={saving} onChange={(e) => setEdits((prev) => ({ ...prev, [f.key]: e.target.value }))}>
                        {TRI_STATE.map((v) => <option key={v} value={v}>{TRI_LABEL[v]}</option>)}
                      </Select>
                    </td>
                    <td>{preview[f.key] === false ? "Hidden" : "Shown"}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
          <div className="pager">
            <Button variant="ghost" disabled={!changeCount || saving} onClick={() => setEdits({})}>Discard</Button>
            <Button disabled={!changeCount || saving || conflict} onClick={save}>Save overrides</Button>
          </div>
        </>
      )}
    </div>
  );
}
