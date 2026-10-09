import { activateDemoMode, demoApi, isDemoMode } from "./demoApi.js";

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

// Anonymous session token, kept in localStorage so the same person comes back as themselves.
const TOKEN_KEY = "knot.token";
let token = null;
try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  /* storage blocked: the session lasts until the tab closes */
}
export const hasSession = () => Boolean(token);
export function setToken(value) {
  token = value;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function request(path, { method = "GET", body, query, headers = {} } = {}) {
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
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
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

const liveApi = {
  meta: () => request("/meta"),
  startSession: (body) => request("/session", { method: "POST", body }),
  randomName: () => request("/random-name"),
  me: () => request("/me"),
  updateMe: (body) => request("/me", { method: "PATCH", body }),
  feed: (query) => request("/hangouts", { query }),
  hangout: (id) => request(`/hangouts/${id}`),
  createHangout: (body) => request("/hangouts", { method: "POST", body }),
  join: (id) => request(`/hangouts/${id}/join`, { method: "POST" }),
  leave: (id) => request(`/hangouts/${id}/join`, { method: "DELETE" }),
  messages: (id, after) => request(`/hangouts/${id}/messages`, { query: { after } }),
  sendMessage: (id, body) => request(`/hangouts/${id}/messages`, { method: "POST", body: { body } }),
  translate: (text, target) => request("/translate", { method: "POST", body: { text, target } }),

  // Random 1:1 chats
  match: () => request("/match", { method: "POST" }),
  cancelMatch: () => request("/match", { method: "DELETE" }),
  conversations: () => request("/conversations"),
  conversation: (id) => request(`/conversations/${id}`),
  conversationMessages: (id, after) => request(`/conversations/${id}/messages`, { query: { after } }),
  sendConversationMessage: (id, body) => request(`/conversations/${id}/messages`, { method: "POST", body: { body } }),
  newTopic: (id) => request(`/conversations/${id}/topic`, { method: "POST" }),
  leaveConversation: (id) => request(`/conversations/${id}/leave`, { method: "POST" }),
  report: (id, reason) => request(`/conversations/${id}/report`, { method: "POST", body: { reason } }),

  // Disaster support
  safety: () => request("/safety"),
  checkin: (status) => request("/safety/checkin", { method: "POST", body: { status } }),
  aid: (query) => request("/aid", { query }),
  createAid: (body) => request("/aid", { method: "POST", body }),
  respondAid: (id) => request(`/aid/${id}/respond`, { method: "POST" }),
  resolveAid: (id) => request(`/aid/${id}/resolve`, { method: "POST" }),
  createAlert: (body, adminToken) => request("/safety/alerts", { method: "POST", body, headers: { "X-Admin-Token": adminToken } }),
  endAlert: (id, adminToken) => request(`/safety/alerts/${id}`, { method: "DELETE", headers: { "X-Admin-Token": adminToken } }),
};

/**
 * A missing local backend should not stop a design review. In development only,
 * starting a session falls back to browser-only presentation data after an API
 * failure. A live API always wins whenever it is available.
 */
const canFallBackToDemo = import.meta.env.DEV && import.meta.env.VITE_DEMO_FALLBACK !== "false";
const isConnectionFailure = (error) => error instanceof ApiError && (!error.status || error.status === 502 || error.status === 503);

export const api = new Proxy(liveApi, {
  get(target, property, receiver) {
    if (property === "startSession" && !isDemoMode()) {
      return async (...args) => {
        try {
          return await target.startSession(...args);
        } catch (error) {
          if (!canFallBackToDemo || !isConnectionFailure(error)) throw error;
          activateDemoMode();
          return demoApi.startSession(...args);
        }
      };
    }
    const source = isDemoMode() ? demoApi : target;
    return Reflect.get(source, property, receiver);
  },
});
