import { Badge, DataTable } from "../../components/ui/index.jsx";

const RouteList = ({ title, routes }) => (routes.length ? (
  <div className="route-list">
    <p className="route-list__title">{title}</p>
    <ul>{routes.map((r) => <li key={r}><code>{r}</code></li>)}</ul>
  </div>
) : null);

export function FeatureToggleTable({ features, values, saved, disabled, onToggle }) {
  return (
    <DataTable>
      <thead>
        <tr><th scope="col">Feature</th><th scope="col">Visible to admins</th><th scope="col">Also used by</th><th scope="col">Endpoints</th></tr>
      </thead>
      <tbody>
        {features.map((feature) => {
          const on = values[feature.key] !== false;
          const dirty = saved[feature.key] !== values[feature.key];
          return (
            <tr key={feature.key}>
              <th scope="row">
                {feature.label} {dirty && <Badge variant="warn">Unsaved</Badge>}
              </th>
              <td>
                <label className="switch">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    disabled={disabled}
                    aria-label={`${feature.label} visible to admins`}
                    onChange={(e) => onToggle(feature.key, e.target.checked)}
                  />
                  <span className="switch__track" aria-hidden="true" />
                  <span className="switch__text">{on ? "Shown" : "Hidden"}</span>
                </label>
              </td>
              <td>{feature.audiences.includes("kitchen") ? <Badge variant="info">Kitchen app (set per kitchen)</Badge> : "—"}</td>
              <td>
                <details>
                  <summary>{feature.routes.reads.length + feature.routes.mutations.length} admin endpoints</summary>
                  <RouteList title="Read" routes={feature.routes.reads} />
                  <RouteList title="Change" routes={feature.routes.mutations} />
                  <RouteList title="Kitchen app" routes={feature.routes.kitchen} />
                  {feature.routes.sharedWith.map((s) => (
                    <p key={s.route} className="route-list__note">
                      <code>{s.route}</code> stays available while any of {s.features.join(", ")} is shown.
                    </p>
                  ))}
                </details>
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
