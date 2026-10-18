import { Button, Modal } from "../../components/ui/index.jsx";
import { formatCount, formatDays, formatMoney, formatQty } from "./format.js";

const display = (value, format) => {
  if (value === null || value === undefined) return "—";
  switch (format) {
    case "count": return formatCount(value);
    case "qty": return formatQty(value);
    case "percent": return typeof value === "number" ? `${value > 0 ? "+" : ""}${value.toFixed(1)}%` : value;
    case "share": return typeof value === "number" ? `${value.toFixed(1)}%` : value;
    case "days": return formatDays(value);
    case "text": return value;
    default: return formatMoney(value);
  }
};

export function CalculationDialog({ spec, onClose }) {
  if (!spec) return null;
  return (
    <Modal
      title={spec.title}
      onClose={onClose}
      wide
      actions={<Button onClick={onClose}>Close explanation</Button>}
    >
      <div className="exec-working">
        {spec.subtitle && <p className="exec-working__subtitle">{spec.subtitle}</p>}
        {spec.intro && <p className="exec-working__intro">{spec.intro}</p>}
        {spec.sections.map((section, sectionIndex) => (
          <section className="exec-working__section" key={section.heading || sectionIndex}>
            {section.heading && <h3>{section.heading}</h3>}
            {section.text && <p className="exec-working__text">{section.text}</p>}
            {section.lines?.length > 0 && <div className="exec-working__table-wrap">
              <table className="exec-working__table">
                <tbody>
                  {section.lines.map((entry, index) => (
                    <tr
                      className={[entry.total && "exec-working__total", entry.selected && "exec-working__selected"].filter(Boolean).join(" ") || undefined}
                      aria-current={entry.selected ? "true" : undefined}
                      key={`${entry.label}-${index}`}
                    >
                      <td className="exec-working__operator" aria-hidden={!entry.op}>{entry.op || ""}</td>
                      <th scope="row">
                        {entry.label}
                        {entry.selected && <span className="exec-working__badge">Selected</span>}
                        {entry.note && <small>{entry.note}</small>}
                      </th>
                      <td>{display(entry.value, entry.format)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
            {section.formula && <p className="exec-working__formula"><strong>Calculation</strong>{section.formula}</p>}
          </section>
        ))}
        {spec.notes?.length > 0 && (
          <aside className="exec-working__notes">
            <strong>Important notes</strong>
            <ul>{spec.notes.map((note) => <li key={note}>{note}</li>)}</ul>
          </aside>
        )}
      </div>
    </Modal>
  );
}
