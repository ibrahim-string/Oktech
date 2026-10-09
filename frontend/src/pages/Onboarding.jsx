import { useEffect, useState } from "react";
import { useApp, Logo } from "../App.jsx";
import { api } from "../api.js";
import { AREAS, STRINGS, uiLang } from "../i18n.js";

const LANGS = ["ja", "en", "zh", "ko", "vi", "pt", "es", "fr", "id", "th", "tl"];

/** Anonymous start: pick a language and a few chips, get a random nickname, go. */
export function Onboarding({ onDone }) {
  const { lang: guessed } = useApp();
  const [form, setForm] = useState(() => ({
    preferred_lang: guessed,
    is_local: guessed === "ja",
    speaks: guessed === "ja" ? ["ja"] : ["en"],
    learning: guessed === "ja" ? ["en"] : ["ja"],
    area: "Osaka",
    name: "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const t = STRINGS[uiLang(form.preferred_lang)];

  const shuffle = () => api.randomName().then(({ name }) => setForm((f) => ({ ...f, name }))).catch(() => {});
  useEffect(() => {
    shuffle();
  }, []);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggle = (key, l) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(l) ? f[key].filter((x) => x !== l) : [...f[key], l] }));

  // Sensible defaults when someone flips "from Japan" / "from abroad".
  const setLocal = (isLocal) =>
    set(
      isLocal
        ? { is_local: true, speaks: ["ja"], learning: ["en"] }
        : { is_local: false, speaks: form.preferred_lang === "ja" ? ["en"] : [form.preferred_lang], learning: ["ja"] },
    );

  const start = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api.startSession(form);
      onDone(token, user);
    } catch (err) {
      setError(err.hint ? `${err.message} ${err.hint}` : err.message);
      setBusy(false);
    }
  };

  return (
    <div className="onboarding" lang={uiLang(form.preferred_lang)}>
      <div className="ob-hero">
        <Logo />
        <h1>{t.welcome_title}</h1>
        <p>{t.welcome_sub}</p>
      </div>

      <form className="card form" onSubmit={start}>
        <fieldset>
          <legend>{t.ob_lang}</legend>
          <div className="seg">
            {["ja", "en"].map((l) => (
              <button
                type="button"
                key={l}
                className={form.preferred_lang === l ? "on" : ""}
                aria-pressed={form.preferred_lang === l}
                onClick={() => set({ preferred_lang: l })}
              >
                {l === "ja" ? "日本語" : "English"}
              </button>
            ))}
            <select
              aria-label="Other language"
              value={["ja", "en"].includes(form.preferred_lang) ? "" : form.preferred_lang}
              onChange={(e) => e.target.value && set({ preferred_lang: e.target.value })}
              className={["ja", "en"].includes(form.preferred_lang) ? "" : "on"}
            >
              <option value="">Other…</option>
              {LANGS.filter((l) => !["ja", "en"].includes(l)).map((l) => (
                <option key={l} value={l}>{STRINGS.en.languages[l]}</option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t.ob_who}</legend>
          <div className="seg two">
            <button type="button" className={form.is_local ? "on" : ""} aria-pressed={form.is_local} onClick={() => setLocal(true)}>
              🇯🇵 {t.ob_local}
            </button>
            <button type="button" className={!form.is_local ? "on" : ""} aria-pressed={!form.is_local} onClick={() => setLocal(false)}>
              🌏 {t.ob_abroad}
            </button>
          </div>
        </fieldset>

        {["speaks", "learning"].map((key) => (
          <fieldset key={key}>
            <legend>{key === "speaks" ? t.ob_speak : t.ob_learn}</legend>
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

        <fieldset>
          <legend>{t.ob_area}</legend>
          <div className="chips">
            {AREAS.map((a) => (
              <button
                type="button"
                key={a}
                className={`pill ${form.area === a ? "on" : ""}`}
                aria-pressed={form.area === a}
                onClick={() => set({ area: a })}
              >
                {t.areas[a]}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          {t.ob_name}
          <div className="name-row">
            <input value={form.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} />
            <button type="button" className="btn ghost small" onClick={shuffle} aria-label={t.ob_shuffle}>
              🎲 {t.ob_shuffle}
            </button>
          </div>
          <span className="hint">{t.ob_name_hint}</span>
        </label>

        {error && <p className="error">{error}</p>}
        <button className="btn wide big" disabled={busy}>
          {busy ? t.loading : `${t.ob_start} →`}
        </button>
        <p className="hint center">🔒 {t.ob_privacy}</p>
      </form>
    </div>
  );
}
