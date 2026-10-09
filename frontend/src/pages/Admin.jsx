import { useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../api.js";
import { AREAS } from "../i18n.js";

const KINDS = ["earthquake", "flood", "typhoon", "tsunami", "other"];
const KEY = "knot.adminToken";

/**
 * Organizer page (#/admin): raise or end emergency alerts. Needs the server's ADMIN_TOKEN.
 * Not linked from the app; for organizers and live demos.
 */
export function Admin() {
  const { t, safety, reloadSafety } = useApp();
  const [token, setTokenState] = useState(() => {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [form, setForm] = useState({ kind: "flood", area: "Osaka", title: "", message: "" });
  const [status, setStatus] = useState(null);

  const saveToken = (v) => {
    setTokenState(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const raise = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      await api.createAlert(form, token);
      setForm((f) => ({ ...f, title: "", message: "" }));
      await reloadSafety();
      setStatus("Alert is live.");
    } catch (err) {
      setStatus(err.message);
    }
  };

  const end = async (id) => {
    try {
      await api.endAlert(id, token);
      await reloadSafety();
    } catch (err) {
      setStatus(err.message);
    }
  };

  const manual = (safety?.alerts ?? []).filter((a) => !a.auto);

  return (
    <div className="page">
      <section className="hero compact">
        <h1>🚨 Emergency alerts</h1>
        <p className="muted">
          Raise an alert to switch KNOT into emergency mode for everyone. Strong earthquakes in Kansai
          (intensity 5- or higher) turn it on automatically.
        </p>
      </section>

      <label className="card form">
        Admin token
        <input type="password" value={token} onChange={(e) => saveToken(e.target.value)} autoComplete="off" />
        <span className="hint">The ADMIN_TOKEN variable set on Railway.</span>
      </label>

      <form className="card form" onSubmit={raise}>
        <div className="row">
          <label>
            Type
            <select value={form.kind} onChange={set("kind")}>
              {KINDS.map((k) => (
                <option key={k} value={k}>{t.alert_kinds[k]}</option>
              ))}
            </select>
          </label>
          <label>
            {t.f_area}
            <select value={form.area} onChange={set("area")}>
              <option value="">All Kansai</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{t.areas[a]}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Title (any language, auto-translated)
          <input required value={form.title} onChange={set("title")} placeholder="Heavy rain and flood warning" />
        </label>
        <label>
          Message
          <textarea rows={3} value={form.message} onChange={set("message")}
            placeholder="Evacuation order (Level 4) along the Yodo River. Go to your nearest shelter." />
        </label>
        <button className="btn wide danger-solid" disabled={!token || !form.title}>Raise alert</button>
        {status && <p className="small">{status}</p>}
      </form>

      <section className="card">
        <h2>Active alerts</h2>
        {manual.length === 0 && <p className="muted small">None.</p>}
        <ul className="aid-list">
          {manual.map((a) => (
            <li key={a.id} className="aid need">
              <h3>{t.alert_kinds[a.kind]} · {a.area ?? "All Kansai"}: {a.title}</h3>
              <button className="btn ghost small" onClick={() => end(a.id)}>End alert</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
