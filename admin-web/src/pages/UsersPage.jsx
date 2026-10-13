import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { Badge, Banner, Button, Card, DataTable, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui/index.jsx";
import { useToast } from "../useToast.js";
import { formatDateTime } from "../businessTime.js";
import { ROLES, isKitchenRole } from "../roles.js";
import { jwtSubject } from "../jwt.js";
import { UserForm } from "./users/UserForm.jsx";
import { patchFromForm } from "./users/userForm.js";
import { createRequestTracker } from "./executive/requestTracker.js";
import "./executive/executive.css";

const ROLE_BADGE = { super_admin: ["info", "Super-admin"], admin: ["neutral", "Admin"], user: ["neutral", "Kitchen"] };
const EMPTY = { name: "", email: "", role: ROLES.USER, godownId: "", active: true, confirmSuperAdmin: false };

const SEARCH_DEBOUNCE_MS = 250;

export function UsersPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ q: "", role: "", active: "", page: 1 });
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const [tracker] = useState(createRequestTracker);

  // Only the newest request may update the list, so a slow earlier search cannot overwrite a newer one.
  const load = useCallback(async () => {
    const request = tracker.start();
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
      const { data: next } = await api.get("/users", { params, signal: request.signal });
      if (!request.isLatest()) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (!request.isLatest()) return;
      setError(e.response?.data?.message || "Could not load users.");
    }
  }, [filters, tracker]);

  useEffect(() => {
    if (search === filters.q) return undefined;
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, q: search, page: 1 })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, filters.q]);

  useEffect(() => () => tracker.cancel(), [tracker]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/inventory/godowns").then(({ data: rows }) => setKitchens(rows)).catch(() => setKitchens([])); }, []);

  const save = async (form) => {
    setBusy(true);
    try {
      if (editing.isNew) {
        const { data: res } = await api.post("/users", { ...form, godownId: isKitchenRole(form.role) ? form.godownId : undefined });
        setNotice(res.inviteSent ? `Invitation sent to ${res.user.email}.` : "Account created, but the invitation email failed. Use “Send password link” to retry.");
      } else {
        await api.patch(`/users/${editing.user._id}`, patchFromForm(editing.user, form));
        showToast("Account updated.", "success");
      }
      setEditing(null);
      load();
    } catch (e) {
      const body = e.response?.data;
      showToast(body?.code === "VERSION_CONFLICT" ? "Someone else changed this account. The list has been reloaded." : body?.message || "Could not save.", "error");
      if (body?.code === "VERSION_CONFLICT") { setEditing(null); load(); }
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async (user) => {
    try {
      const { data: res } = await api.post(`/users/${user._id}/send-reset`);
      showToast(res.sent ? `Password link sent to ${user.email}.` : "The email could not be sent.", res.sent ? "success" : "error");
    } catch (e) {
      showToast(e.response?.data?.message || "Could not send the link.", "error");
    }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts, change roles and kitchens, and deactivate access."
        actions={<Button onClick={() => setEditing({ isNew: true, user: EMPTY })}>Add user</Button>} />
      {notice && <Banner variant="info">{notice}</Banner>}
      <div className="exec-filters">
        <input aria-label="Search by name or email" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Role" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}>
          <option value="">All roles</option><option value="super_admin">Super-admins</option><option value="admin">Admins</option><option value="user">Kitchen users</option>
        </select>
        <select aria-label="Status" value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value, page: 1 })}>
          <option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option>
        </select>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}
      {!data && !error && <LoadingState />}
      {data && (
        <Card>
          {data.total === 0 ? <EmptyState title="No users match these filters" /> : (
            <DataTable>
              <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Kitchen</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <th scope="row">{u.name}</th>
                    <td>{u.email}</td>
                    <td><Badge variant={ROLE_BADGE[u.role][0]}>{ROLE_BADGE[u.role][1]}</Badge></td>
                    <td>{u.kitchenName || "—"}</td>
                    <td>{u.active ? "Active" : <Badge variant="warn">Inactive</Badge>}</td>
                    <td>{formatDateTime(u.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ isNew: false, user: u })}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => sendReset(u)}>Send password link</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
          <div className="pager">
            <Button size="sm" variant="ghost" disabled={data.page <= 1} onClick={() => setFilters({ ...filters, page: data.page - 1 })}>Previous</Button>
            <span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
            <Button size="sm" variant="ghost" disabled={data.page * data.pageSize >= data.total} onClick={() => setFilters({ ...filters, page: data.page + 1 })}>Next</Button>
          </div>
        </Card>
      )}
      {editing && (
        <UserForm
          title={editing.isNew ? "Add user" : `Edit ${editing.user.name}`}
          initial={editing.isNew ? EMPTY : { ...editing.user, godownId: editing.user.godownId || "", confirmSuperAdmin: false }}
          kitchens={kitchens}
          isNew={editing.isNew}
          isSelf={!editing.isNew && String(editing.user._id) === jwtSubject(localStorage.getItem("accessToken"))}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </>
  );
}
