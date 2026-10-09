const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || "/api";

let userId = null;
export const setApiUser = (id) => {
  userId = id;
};

async function request(path, { method = "GET", body, query } = {}) {
  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== ""))
    : "";
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(userId ? { "X-User-Id": String(userId) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
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
