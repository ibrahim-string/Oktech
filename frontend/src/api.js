/**
 * Resolve the backend base URL.
 * - Dev: unset → "/api" (proxied to localhost:3001 by vite.config.js).
 * - Prod: VITE_API_URL, e.g. "https://knot-api.up.railway.app". A missing protocol
 *   and a trailing slash are tolerated, since both are easy to get wrong in the Vercel UI.
 */
function resolveBase(raw) {
  let url = (raw ?? "").trim().replace(/\/+$/, "");
  if (!url) return import.meta.env.DEV ? "/api" : null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

export const API_BASE = resolveBase(import.meta.env.VITE_API_URL);

export class ApiError extends Error {
  constructor(message, { status, url, hint } = {}) {
    super(message);
    this.status = status;
    this.url = url;
    this.hint = hint;
  }
}

let userId = null;
export const setApiUser = (id) => {
  userId = id;
};

async function request(path, { method = "GET", body, query } = {}) {
  if (!API_BASE) {
    throw new ApiError("VITE_API_URL is not set for this build.", {
      hint: "In Vercel → Settings → Environment Variables, set VITE_API_URL to your Railway URL, then redeploy (Vite bakes it in at build time).",
    });
  }
  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ""))
    : "";
  const url = `${API_BASE}${path}${qs}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(userId ? { "X-User-Id": String(userId) } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // The browser hides the reason (CORS, DNS, server down, mixed content) behind one TypeError.
    throw new ApiError(`Couldn't reach the API at ${API_BASE}.`, {
      url,
      hint: `Open ${API_BASE}/health in a new tab. If it doesn't load, the backend is down or the Railway domain points to the wrong port. If it does load, check CORS_ORIGIN on Railway includes ${window.location.origin}.`,
    });
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!isJson) {
    throw new ApiError(`The API URL returned a non-JSON response (${res.status}).`, {
      status: res.status,
      url,
      hint: `${API_BASE} doesn't look like the KNOT backend. Check VITE_API_URL.`,
    });
  }
  if (!res.ok) throw new ApiError(data?.error ?? `Request failed (${res.status})`, { status: res.status, url });
  return data;
}

export const api = {
  meta: () => request("/meta"),
  users: () => request("/users"),
  createUser: (body) => request("/users", { method: "POST", body }),
  updateMe: (body) => request("/users/me", { method: "PATCH", body }),
  feed: (query) => request("/hangouts", { query }),
  hangout: (id) => request(`/hangouts/${id}`),
  createHangout: (body) => request("/hangouts", { method: "POST", body }),
  join: (id) => request(`/hangouts/${id}/join`, { method: "POST" }),
  leave: (id) => request(`/hangouts/${id}/join`, { method: "DELETE" }),
  messages: (id, after) => request(`/hangouts/${id}/messages`, { query: { after } }),
  sendMessage: (id, body) => request(`/hangouts/${id}/messages`, { method: "POST", body: { body } }),
  translate: (text, target) => request("/translate", { method: "POST", body: { text, target } }),
};
