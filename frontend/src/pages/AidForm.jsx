import { useState } from "react";
import { navigate, useApp } from "../App.jsx";
import { api } from "../api.js";
import { AREAS } from "../i18n.js";

const CATEGORIES = ["interpreting", "supplies", "shelter", "transport", "info", "check_on", "other"];

export function AidForm() {
  const { t, user } = useApp();
  const initialKind = new URLSearchParams(window.location.hash.split("?")[1]).get("kind") === "need" ? "need" : "offer";
  const [form, setForm] = useState({
    kind: initialKind,
    category: "interpreting",
    title: "",
    body: "",
    area: AREAS.includes(user.area) ? user.area : "Osaka",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.createAid(form);
      navigate("/help");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <a href="#/help" className="back">← {t.back}</a>
      <section className="hero compact">
        <h1>{t.aid_form_title}</h1>
        <p className="muted">{t.aid_form_sub}</p>
      </section>
      <form className="card form" onSubmit={submit}>
        <fieldset>
          <legend>{t.aid_kind}</legend>
          <div className="seg two">
            <button type="button" className={`sos ${form.kind === "need" ? "on" : ""}`} aria-pressed={form.kind === "need"}
              onClick={() => setForm((f) => ({ ...f, kind: "need" }))}>
              🆘 {t.aid_kind_need}
            </button>
            <button type="button" className={`ok ${form.kind === "offer" ? "on" : ""}`} aria-pressed={form.kind === "offer"}
              onClick={() => setForm((f) => ({ ...f, kind: "offer" }))}>
              💪 {t.aid_kind_offer}
            </button>
          </div>
        </fieldset>

        <label>
          {t.f_category}
          <select value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t.aid_categories[c]}</option>
            ))}
          </select>
        </label>

        <label>
          {t.f_title}
          <input required maxLength={140} value={form.title} onChange={set("title")}
            placeholder={form.kind === "need" ? t.aid_title_ph_need : t.aid_title_ph_offer} />
        </label>
        <label>
          {t.f_description}
          <textarea rows={4} maxLength={1500} value={form.body} onChange={set("body")} placeholder={t.aid_body_ph} />
        </label>
        <label>
          {t.f_area}
          <select value={form.area} onChange={set("area")}>
            {AREAS.map((a) => (
              <option key={a} value={a}>{t.areas[a]}</option>
            ))}
          </select>
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn wide" disabled={busy || !form.title.trim()}>
          {busy ? t.posting : t.aid_post}
        </button>
      </form>
    </div>
  );
}
