import "./kitchen-ui.css";

export default function KitchenSectionNav({ label, items, value, onChange }) {
  return (
    <nav className="kitchen-section-nav" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`kitchen-section-nav__item${value === item.value ? " kitchen-section-nav__item--active" : ""}`}
          aria-current={value === item.value ? "page" : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
