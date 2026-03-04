/**
 * Lightweight API client for the Resident Directory backend.
 *
 * Notes:
 * - Uses REACT_APP_API_BASE_URL for configuring the backend URL.
 * - Stores auth token in localStorage under 'rd_token'.
 */

const TOKEN_KEY = "rd_token";

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /** Returns the configured API base URL (no trailing slash).

  CRA only exposes env vars prefixed with REACT_APP_.
  We support multiple names to match different deployment manifests.
  */
  const raw =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_BASE ||
    "";
  return raw.replace(/\/+$/, "");
}

function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (!token) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, token);
}

// PUBLIC_INTERFACE
export function getStoredToken() {
  /** Get the current stored token, if any. */
  return getToken();
}

// PUBLIC_INTERFACE
export function clearStoredToken() {
  /** Clears the auth token from storage. */
  setToken(null);
}

async function parseJsonSafe(resp) {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function apiFetch(path, { method = "GET", body, token, headers } = {}) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "Frontend is not configured. Set REACT_APP_API_BASE_URL to your backend URL."
    );
  }

  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const finalHeaders = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(headers || {}),
  };

  const authToken = token ?? getToken();
  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  }

  const resp = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const data = await parseJsonSafe(resp);
    const msg =
      (data && (data.detail || data.message)) ||
      `${resp.status} ${resp.statusText}`;
    const err = new Error(msg);
    err.status = resp.status;
    err.data = data;
    throw err;
  }

  return parseJsonSafe(resp);
}

/**
 * The provided backend OpenAPI in this environment currently only exposes "/" health.
 * These endpoints are implemented to match the work item contract:
 * - POST /auth/login  -> { access_token }
 * - POST /auth/logout
 * - GET /residents?query=...
 * - GET /residents/:id
 * - POST /residents
 * - PUT /residents/:id
 * - DELETE /residents/:id
 *
 * If backend paths differ, adjust these mappings.
 */

// PUBLIC_INTERFACE
export async function healthCheck() {
  /** Checks backend availability. */
  return apiFetch("/", { method: "GET" });
}

// PUBLIC_INTERFACE
export async function login({ username, password }) {
  /** Login as admin. Returns { token }. */
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: { username, password },
  });

  const token = data?.access_token || data?.token;
  if (!token) throw new Error("Login succeeded but no token was returned.");
  setToken(token);
  return { token };
}

// PUBLIC_INTERFACE
export async function logout() {
  /** Logout current admin session (best-effort). */
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } finally {
    setToken(null);
  }
}

// PUBLIC_INTERFACE
export async function listResidents({ query = "", includeInactive = false } = {}) {
  /** Fetch list of residents; supports optional search query. */
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (includeInactive) params.set("include_inactive", "true");
  const qs = params.toString();
  return apiFetch(`/residents${qs ? `?${qs}` : ""}`, { method: "GET" });
}

// PUBLIC_INTERFACE
export async function getResident(id) {
  /** Fetch a resident by ID. */
  return apiFetch(`/residents/${encodeURIComponent(id)}`, { method: "GET" });
}

// PUBLIC_INTERFACE
export async function createResident(payload) {
  /** Create a new resident (admin). */
  return apiFetch("/residents", { method: "POST", body: payload });
}

// PUBLIC_INTERFACE
export async function updateResident(id, payload) {
  /** Update an existing resident (admin). */
  return apiFetch(`/residents/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
}

// PUBLIC_INTERFACE
export async function deleteResident(id) {
  /** Delete a resident (admin). */
  return apiFetch(`/residents/${encodeURIComponent(id)}`, { method: "DELETE" });
}
