import { RotateCcw } from "lucide-react";
import { Button, DateField, Field, Select } from "../../components/ui/index.jsx";
import { PRESETS, customRangeBounds } from "./reportParams.js";

const PRESET_LABELS = { "7d": "7 days", "30d": "30 days", "90d": "90 days", custom: "Custom" };

export function ReportFilters({ state, kitchens, today, onChange, onReset, canReset, disabled }) {
  const active = kitchens.filter((k) => k.active !== false);
  const inactive = kitchens.filter((k) => k.active === false);
  const bounds = customRangeBounds({ from: state.from, to: state.to, today });
  return (
    <div className="exec-filters" role="group" aria-label="Report filters">
      <Field label="Kitchen" className="exec-filters__kitchen">
        <Select
          value={state.godownId}
          disabled={disabled}
          onChange={(e) => onChange({ godownId: e.target.value })}
        >
          <option value="all">All kitchens</option>
          {active.length > 0 && (
            <optgroup label="Active">
              {active.map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
            </optgroup>
          )}
          {inactive.length > 0 && (
            <optgroup label="Inactive">
              {inactive.map((k) => <option key={k._id} value={k._id}>{k.name} (inactive)</option>)}
            </optgroup>
          )}
        </Select>
      </Field>
      <div className="exec-filters__range" role="group" aria-label="Date range">
        {[...Object.keys(PRESETS), "custom"].map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={state.preset === preset}
            className={`exec-chip${state.preset === preset ? " exec-chip--on" : ""}`}
            disabled={disabled}
            onClick={() => onChange(preset === "custom" ? { preset, from: state.from, to: state.to } : { preset })}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      {state.preset === "custom" && (
        <div className="exec-filters__dates">
          <Field label="From">
            <DateField value={state.from} min={bounds.fromMin} max={bounds.fromMax} onChange={(e) => e.target.value && onChange({ preset: "custom", from: e.target.value, to: state.to })} disabled={disabled} />
          </Field>
          <Field label="To">
            <DateField value={state.to} min={bounds.toMin} max={bounds.toMax} onChange={(e) => e.target.value && onChange({ preset: "custom", from: state.from, to: e.target.value })} disabled={disabled} />
          </Field>
        </div>
      )}
      {canReset && (
        <Button variant="ghost" size="sm" onClick={onReset} disabled={disabled}>
          <RotateCcw size={14} aria-hidden="true" /> Reset filters
        </Button>
      )}
    </div>
  );
}
