import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  clearStoredToken,
  getStoredToken,
  healthCheck,
  listResidents,
  login,
  logout,
  createResident,
  updateResident,
  deleteResident,
} from "./api/client";

/** @typedef {{ id: string|number, name: string, unit: string, email?: string, phone?: string, status?: string, notes?: string }} Resident */

function formatStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "inactive") return { label: "Inactive", kind: "muted" };
  return { label: "Active", kind: "success" };
}

function safeString(v) {
  return v === null || v === undefined ? "" : String(v);
}

function matchesResident(resident, q) {
  const query = q.trim().toLowerCase();
  if (!query) return true;

  const hay = [
    resident.name,
    resident.unit,
    resident.email,
    resident.phone,
    resident.status,
    resident.notes,
  ]
    .map(safeString)
    .join(" ")
    .toLowerCase();

  return hay.includes(query);
}

function Modal({ title, subtitle, children, footer, onClose }) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // Click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function ResidentDetail({ resident, onClose }) {
  const { label, kind } = formatStatus(resident?.status);

  return (
    <Modal
      title={resident?.name || "Resident"}
      subtitle={`Unit ${safeString(resident?.unit)} • ${label}`}
      onClose={onClose}
      footer={
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="field-row">
        <div className="field">
          <div className="label">Unit</div>
          <div className="input" aria-readonly="true">
            {safeString(resident?.unit)}
          </div>
        </div>
        <div className="field">
          <div className="label">Status</div>
          <div className={`badge ${kind}`}>
            <span className="dot" /> {label}
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="field-row">
        <div className="field">
          <div className="label">Email</div>
          <div className="input" aria-readonly="true">
            {resident?.email ? (
              <a href={`mailto:${resident.email}`}>{resident.email}</a>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        </div>
        <div className="field">
          <div className="label">Phone</div>
          <div className="input" aria-readonly="true">
            {resident?.phone ? (
              <a href={`tel:${resident.phone}`}>{resident.phone}</a>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="spacer" />

      <div className="field">
        <div className="label">Notes</div>
        <div className="textarea" aria-readonly="true">
          {resident?.notes ? resident.notes : <span className="muted">—</span>}
        </div>
      </div>
    </Modal>
  );
}

function ResidentForm({ mode, initialValue, onCancel, onSubmit, submitting }) {
  const [value, setValue] = useState(() => ({
    name: initialValue?.name || "",
    unit: initialValue?.unit || "",
    email: initialValue?.email || "",
    phone: initialValue?.phone || "",
    status: initialValue?.status || "active",
    notes: initialValue?.notes || "",
  }));

  const canSubmit = value.name.trim() && value.unit.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(value);
      }}
    >
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="input"
            value={value.name}
            onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
            placeholder="e.g. Jordan Lee"
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="unit">
            Unit
          </label>
          <input
            id="unit"
            className="input"
            value={value.unit}
            onChange={(e) => setValue((v) => ({ ...v, unit: e.target.value }))}
            placeholder="e.g. 4B"
            required
          />
        </div>
      </div>

      <div className="spacer" />

      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="input"
            value={value.email}
            onChange={(e) => setValue((v) => ({ ...v, email: e.target.value }))}
            placeholder="email@example.com"
            type="email"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            className="input"
            value={value.phone}
            onChange={(e) => setValue((v) => ({ ...v, phone: e.target.value }))}
            placeholder="+1 (555) 555-5555"
          />
        </div>
      </div>

      <div className="spacer" />

      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className="select"
            value={value.status}
            onChange={(e) =>
              setValue((v) => ({ ...v, status: e.target.value }))
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="help">Inactive residents can be hidden from public.</div>
        </div>
        <div className="field">
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="textarea"
            value={value.notes}
            onChange={(e) => setValue((v) => ({ ...v, notes: e.target.value }))}
            placeholder="Optional notes..."
          />
        </div>
      </div>

      <div className="spacer" />

      <div className="actions" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Add resident"}
        </button>
      </div>
    </form>
  );
}

function PublicDirectory({ residents, loading, error, query, setQuery, onOpen }) {
  const filtered = useMemo(() => {
    const items = Array.isArray(residents) ? residents : residents?.items || [];
    // Public view: show active by default (backend may already filter)
    const onlyActive = items.filter((r) =>
      (r.status || "active").toLowerCase() !== "inactive"
    );
    // Client-side filter for responsiveness even if backend doesn't implement query param yet
    return onlyActive.filter((r) => matchesResident(r, query));
  }, [residents, query]);

  return (
    <>
      <h1 className="page-title">Resident Directory</h1>
      <p className="page-subtitle">
        Search by name, unit, email, or phone. Click a resident to view details.
      </p>

      <div className="card">
        <div className="card-inner">
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 240 }}>
              <label className="label" htmlFor="search">
                Search
              </label>
              <input
                id="search"
                className="input"
                placeholder="Try “4B”, “Lee”, or an email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="help">
                Tip: Press <span className="kbd">Ctrl</span> +{" "}
                <span className="kbd">K</span> to focus search.
              </div>
            </div>
            <div className="pill" title="Public view">
              <span className="pill-dot" /> Public
            </div>
          </div>

          <div className="spacer" />

          {error ? <div className="alert error">{safeString(error)}</div> : null}
          {loading ? <div className="alert info">Loading residents…</div> : null}

          <div className="spacer" />

          <div className="table-wrap" aria-label="Residents table">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="small">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const { label, kind } = formatStatus(r.status);
                  return (
                    <tr
                      key={r.id ?? `${r.name}-${r.unit}`}
                      className="clickable"
                      onClick={() => onOpen(r)}
                      title="View details"
                    >
                      <td>
                        <strong>{safeString(r.name)}</strong>
                      </td>
                      <td>{safeString(r.unit)}</td>
                      <td>{r.email ? safeString(r.email) : <span className="muted">—</span>}</td>
                      <td>{r.phone ? safeString(r.phone) : <span className="muted">—</span>}</td>
                      <td className="small">
                        <span className={`badge ${kind}`}>
                          <span className="dot" /> {label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No residents match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function AdminLogin({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <h1 className="page-title">Admin Login</h1>
      <p className="page-subtitle">Sign in to manage residents (add/edit/delete).</p>

      <div className="card">
        <div className="card-inner">
          {error ? <div className="alert error">{error}</div> : null}

          <div className="field-row">
            <div className="field">
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="spacer" />

          <div className="actions" style={{ justifyContent: "flex-end" }}>
            <button
              className="btn btn-primary"
              onClick={async () => {
                setSubmitting(true);
                setError("");
                try {
                  await login({ username, password });
                  onLoggedIn();
                } catch (e) {
                  setError(e?.message || "Login failed.");
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!username.trim() || !password || submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </div>

          <div className="spacer" />
          <div className="help">
            Backend must expose <code>/auth/login</code> returning{" "}
            <code>{"{ access_token }"}</code>.
          </div>
        </div>
      </div>
    </>
  );
}

function AdminResidents({
  residents,
  loading,
  error,
  query,
  setQuery,
  onOpen,
  onCreate,
  onEdit,
  onDelete,
}) {
  const items = useMemo(() => {
    const list = Array.isArray(residents) ? residents : residents?.items || [];
    return list.filter((r) => matchesResident(r, query));
  }, [residents, query]);

  return (
    <>
      <h1 className="page-title">Manage Residents</h1>
      <p className="page-subtitle">
        Add, edit, or remove residents. Use search to quickly find a record.
      </p>

      <div className="card">
        <div className="card-inner">
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 240 }}>
              <label className="label" htmlFor="admin-search">
                Search
              </label>
              <input
                id="admin-search"
                className="input"
                placeholder="Search residents…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="actions">
              <button className="btn btn-primary" onClick={onCreate}>
                + Add resident
              </button>
            </div>
          </div>

          <div className="spacer" />
          {error ? <div className="alert error">{safeString(error)}</div> : null}
          {loading ? <div className="alert info">Loading residents…</div> : null}
          <div className="spacer" />

          <div className="table-wrap" aria-label="Admin residents table">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="small">Status</th>
                  <th className="small">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const { label, kind } = formatStatus(r.status);
                  return (
                    <tr key={r.id ?? `${r.name}-${r.unit}`}>
                      <td className="clickable" onClick={() => onOpen(r)} title="View details">
                        <strong>{safeString(r.name)}</strong>
                      </td>
                      <td>{safeString(r.unit)}</td>
                      <td>{r.email ? safeString(r.email) : <span className="muted">—</span>}</td>
                      <td>{r.phone ? safeString(r.phone) : <span className="muted">—</span>}</td>
                      <td className="small">
                        <span className={`badge ${kind}`}>
                          <span className="dot" /> {label}
                        </span>
                      </td>
                      <td className="small">
                        <div className="actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(r)}>
                            Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => onDelete(r)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No residents match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Resident Directory frontend app (public directory + admin management). */

  const [page, setPage] = useState("public"); // 'public' | 'admin' | 'login'
  const [token, setToken] = useState(() => getStoredToken());

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [adminQuery, setAdminQuery] = useState("");

  const [selectedResident, setSelectedResident] = useState(null);

  const [formMode, setFormMode] = useState(null); // 'create' | 'edit' | null
  const [formInitial, setFormInitial] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Keyboard shortcut: Ctrl+K focuses search on public page
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const id = page === "public" ? "search" : page === "admin" ? "admin-search" : null;
        if (id) document.getElementById(id)?.focus();
      }
      if (e.key === "Escape") {
        setSelectedResident(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [page]);

  const isAuthed = !!token;

  useEffect(() => {
    // Keep token synced with storage changes made by api client
    setToken(getStoredToken());
  }, [page]);

  useEffect(() => {
    // Gate admin page
    if (page === "admin" && !isAuthed) setPage("login");
    if (page === "login" && isAuthed) setPage("admin");
  }, [page, isAuthed]);

  async function refreshResidents({ includeInactive } = {}) {
    setLoading(true);
    setError("");
    try {
      // Best-effort health check helps surface config issues early
      await healthCheck();
      const data = await listResidents({ query: "", includeInactive: !!includeInactive });
      setResidents(data || []);
    } catch (e) {
      setError(e?.message || "Failed to load residents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load on mount
    refreshResidents({ includeInactive: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerStatus = useMemo(() => {
    if (page === "public") return { label: "Public", dot: "var(--accent)" };
    if (page === "admin") return { label: "Admin", dot: "var(--primary)" };
    return { label: "Admin Login", dot: "var(--primary)" };
  }, [page]);

  return (
    <div className="App">
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-text">
              <div className="brand-title">Resident Directory</div>
              <div className="brand-subtitle">Search & manage residents</div>
            </div>
          </div>

          <nav className="nav" aria-label="Primary navigation">
            <a
              href="#public"
              className={page === "public" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                setPage("public");
              }}
            >
              Directory
            </a>
            <a
              href="#admin"
              className={page === "admin" || page === "login" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                setPage(isAuthed ? "admin" : "login");
              }}
            >
              Admin
            </a>
          </nav>

          <div className="nav-right">
            <div className="pill" title="Current view">
              <span
                className="pill-dot"
                style={{ background: headerStatus.dot }}
              />{" "}
              {headerStatus.label}
            </div>

            {isAuthed ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await logout();
                  clearStoredToken();
                  setToken(null);
                  setPage("public");
                  // refresh to ensure public list is updated
                  refreshResidents({ includeInactive: false });
                }}
              >
                Logout
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage("login")}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {page === "public" ? (
            <PublicDirectory
              residents={residents}
              loading={loading}
              error={error}
              query={query}
              setQuery={setQuery}
              onOpen={(r) => setSelectedResident(r)}
            />
          ) : null}

          {page === "login" ? (
            <AdminLogin
              onLoggedIn={() => {
                setToken(getStoredToken());
                setPage("admin");
                refreshResidents({ includeInactive: true });
              }}
            />
          ) : null}

          {page === "admin" ? (
            <AdminResidents
              residents={residents}
              loading={loading}
              error={error}
              query={adminQuery}
              setQuery={setAdminQuery}
              onOpen={(r) => setSelectedResident(r)}
              onCreate={() => {
                setFormMode("create");
                setFormInitial(null);
              }}
              onEdit={(r) => {
                setFormMode("edit");
                setFormInitial(r);
              }}
              onDelete={async (r) => {
                const ok = window.confirm(
                  `Delete resident "${safeString(r.name)}" (Unit ${safeString(
                    r.unit
                  )})? This cannot be undone.`
                );
                if (!ok) return;

                setError("");
                try {
                  await deleteResident(r.id);
                  await refreshResidents({ includeInactive: true });
                } catch (e) {
                  setError(e?.message || "Delete failed.");
                }
              }}
            />
          ) : null}
        </div>
      </main>

      {selectedResident ? (
        <ResidentDetail
          resident={selectedResident}
          onClose={() => setSelectedResident(null)}
        />
      ) : null}

      {formMode ? (
        <Modal
          title={formMode === "edit" ? "Edit resident" : "Add resident"}
          subtitle={
            formMode === "edit"
              ? "Update resident details and status."
              : "Create a new resident record."
          }
          onClose={() => {
            if (!formSubmitting) {
              setFormMode(null);
              setFormInitial(null);
            }
          }}
          footer={null}
        >
          <ResidentForm
            mode={formMode === "edit" ? "edit" : "create"}
            initialValue={formInitial}
            submitting={formSubmitting}
            onCancel={() => {
              if (!formSubmitting) {
                setFormMode(null);
                setFormInitial(null);
              }
            }}
            onSubmit={async (payload) => {
              setFormSubmitting(true);
              setError("");
              try {
                if (formMode === "edit") {
                  await updateResident(formInitial.id, payload);
                } else {
                  await createResident(payload);
                }
                setFormMode(null);
                setFormInitial(null);
                await refreshResidents({ includeInactive: true });
              } catch (e) {
                setError(e?.message || "Save failed.");
              } finally {
                setFormSubmitting(false);
              }
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

export default App;
