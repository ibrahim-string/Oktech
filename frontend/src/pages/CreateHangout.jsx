import { useState } from "react";
import { navigate, useApp } from "../App.jsx";
import { api } from "../api.js";
import { AREAS, CATEGORY_ICONS } from "../i18n.js";

const LANG_OPTIONS = ["ja", "en", "zh", "ko", "vi", "pt", "es", "fr"];

function defaultWhen() {
  // Next Saturday at 14:00, in the browser's local time, formatted for datetime-local.
  const d = new Date();
  d.setDate(d.getDate() + (((6 - d.getDay() + 7) % 7) || 7));
  d.setHours(14, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T14:00`;
}

export function CreateHangout() {
  const { t, user } = useApp();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "language_exchange",
    area: AREAS.includes(user.area) ? user.area : "Osaka",
    place_name: "",
    starts_at: defaultWhen(),
    languages: [...new Set([...user.speaks, ...user.learning, "ja", "en"])].filter((l) => LANG_OPTIONS.includes(l)).slice(0, 2),
    max_participants: 4,
  });
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleLang = (l) =>
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l],
    }));

  // Preview in the "other" language: Japanese for non-Japanese users, English for Japanese users.
  const previewLang = user.preferred_lang === "ja" ? "en" : "ja";

  const runPreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const [title, description] = await Promise.all([
        api.translate(form.title, previewLang),
        form.description ? api.translate(form.description, previewLang) : { text: "" },
      ]);
      setPreview({ title: title.text, description: description.text, translated: title.translated });
    } catch (e) {
      setError(e.message);
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const h = await api.createHangout({
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        max_participants: Number(form.max_participants),
      });
      navigate(`/h/${h.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <section className="hero compact">
        <h1>{t.create_title}</h1>
        <p className="muted">{t.create_sub}</p>
      </section>

      <form className="card form" onSubmit={submit}>
        <fieldset>
          <legend>{t.f_category}</legend>
          <div className="cat-grid">
            {Object.keys(CATEGORY_ICONS).map((c) => (
              <label key={c} className={`cat-option ${form.category === c ? "on" : ""}`}>
                <input type="radio" name="category" value={c} checked={form.category === c} onChange={set("category")} />
                <span aria-hidden>{CATEGORY_ICONS[c]}</span>
                {t.categories[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          {t.f_title}
          <input required maxLength={120} value={form.title} onChange={set("title")} placeholder={t.f_title_ph} />
        </label>
        <label>
          {t.f_description}
          <textarea rows={4} maxLength={1500} value={form.description} onChange={set("description")} placeholder={t.f_description_ph} />
        </label>

        <div className="row">
          <label>
            {t.f_area}
            <select value={form.area} onChange={set("area")}>
              {AREAS.map((a) => (
                <option key={a} value={a}>{t.areas[a]}</option>
              ))}
            </select>
          </label>
          <label>
            {t.f_when}
            <input type="datetime-local" required value={form.starts_at} onChange={set("starts_at")} />
          </label>
        </div>

        <label>
          {t.f_place}
          <input required maxLength={120} value={form.place_name} onChange={set("place_name")} placeholder={t.f_place_ph} />
          <span className="hint">🛡️ {t.place_hint}</span>
        </label>

        <fieldset>
          <legend>{t.f_languages}</legend>
          <div className="chips">
            {LANG_OPTIONS.map((l) => (
              <button
                type="button"
                key={l}
                className={`pill ${form.languages.includes(l) ? "on" : ""}`}
                onClick={() => toggleLang(l)}
                aria-pressed={form.languages.includes(l)}
              >
                {t.languages[l]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="inline">
          {t.f_max}
          <input type="number" min={2} max={20} value={form.max_participants} onChange={set("max_participants")} />
        </label>

        <button type="button" className="btn ghost wide" disabled={!form.title || previewing} onClick={runPreview}>
          ✨ {previewing ? t.loading : t.preview(t.languages[previewLang])}
        </button>
        {preview && (
          <div className="preview">
            <p className="eyebrow">{t.preview_title(t.languages[previewLang])}</p>
            <h3>{preview.title}</h3>
            {preview.description && <p>{preview.description}</p>}
          </div>
        )}

        {error && <p className="error">{error}</p>}
        <button className="btn wide" disabled={saving || form.languages.length === 0}>
          {saving ? t.posting : t.post}
        </button>
      </form>
    </div>
  );
}
