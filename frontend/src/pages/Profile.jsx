import { useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../api.js";
import { AREAS, listLangs } from "../i18n.js";
import { Avatar } from "../components/Avatar.jsx";
import { ChatList } from "./Meet.jsx";

const LANGS = ["ja", "en", "zh", "ko", "vi", "pt", "es", "fr", "id", "th", "tl"];

export function Profile() {
  const { t, user, setUser } = useApp();
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio,
    area: user.area,
    preferred_lang: user.preferred_lang,
    speaks: user.speaks,
    learning: user.learning,
    interests: user.interests.join(", "),
  });
  const [status, setStatus] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggle = (key, l) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(l) ? f[key].filter((x) => x !== l) : [...f[key], l],
    }));

  const save = async (e) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const updated = await api.updateMe({
        ...form,
        interests: form.interests.split(/[,、]/).map((s) => s.trim()).filter(Boolean),
      });
      setUser(updated);
      setStatus("saved");
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <div className="page">
      <section className="card profile-head">
        <Avatar user={user} size={64} />
        <div>
          <h1>{user.name}</h1>
          <p className="muted small">
            {user.is_local ? t.local : t.resident} · {t.areas[user.area] ?? user.area}
          </p>
          <p className="small">
            <span className="muted">{t.speaks}:</span> {listLangs(user.speaks, t)} ·{" "}
            <span className="muted">{t.learning}:</span> {listLangs(user.learning, t)}
          </p>
        </div>
      </section>

      <form className="card form" onSubmit={save}>
        <h2>{t.profile}</h2>
        <label>
          {t.app_language}
          <select value={form.preferred_lang} onChange={set("preferred_lang")}>
            {LANGS.map((l) => (
              <option key={l} value={l}>{t.languages[l]}</option>
            ))}
          </select>
        </label>
        <div className="row">
          <label>
            {t.name}
            <input required value={form.name} onChange={set("name")} />
          </label>
          <label>
            {t.f_area}
            <select value={form.area} onChange={set("area")}>
              {AREAS.map((a) => (
                <option key={a} value={a}>{t.areas[a]}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          {t.bio}
          <textarea rows={3} value={form.bio} onChange={set("bio")} />
        </label>
        {["speaks", "learning"].map((key) => (
          <fieldset key={key}>
            <legend>{t[key]}</legend>
            <div className="chips">
              {LANGS.map((l) => (
                <button
                  type="button"
                  key={l}
                  className={`pill ${form[key].includes(l) ? "on" : ""}`}
                  aria-pressed={form[key].includes(l)}
                  onClick={() => toggle(key, l)}
                >
                  {t.languages[l]}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <label>
          {t.interests}
          <input value={form.interests} onChange={set("interests")} />
          <span className="hint">{t.interests_hint}</span>
        </label>
        <button className="btn wide" disabled={status === "saving"}>
          {status === "saving" ? t.loading : t.save}
        </button>
        {status === "saved" && <p className="ok">✓ {t.saved}</p>}
        {status && !["saving", "saved"].includes(status) && <p className="error">{status}</p>}
      </form>

      <ChatList />
    </div>
  );
}
