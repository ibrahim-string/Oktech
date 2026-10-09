import { useEffect, useRef, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../api.js";
import { AREAS, STRINGS, uiLang } from "../i18n.js";

const LANGS = ["ja", "en", "zh", "ko", "vi", "pt", "es", "fr", "id", "th", "tl"];
const STEPS = 6;
const pad = (n) => String(n).padStart(2, "0");
const accent = (s) => s.split(/(Kansai|関西)/).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part));

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
  const [step, setStep] = useState(1);
  const steps = useRef([]);
  const ui = uiLang(form.preferred_lang);
  const t = STRINGS[ui];
  const alt = ui === "ja" ? "en" : "ja";
  const isOther = !["ja", "en"].includes(form.preferred_lang);

  const shuffle = () => api.randomName().then(({ name }) => setForm((f) => ({ ...f, name }))).catch(() => {});
  useEffect(() => {
    shuffle();
  }, []);

  // The step crossing the middle of the screen is the one you're on.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setStep(Number(e.target.dataset.step))),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    steps.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const stepProps = (n) => ({
    className: `ob-step${step === n ? " on" : ""}`,
    "data-step": n,
    ref: (el) => {
      steps.current[n - 1] = el;
    },
    onFocus: () => setStep(n),
    onPointerDown: () => setStep(n),
  });
  const group = (n) => ({ ...stepProps(n), role: "group", "aria-labelledby": `ob-q${n}` });

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
    <div className="ob" lang={ui}>
      <div className="ob-bar">
        <span className="ob-logo">
          KNOT <span className="ob-musubi" lang="ja">結</span>
        </span>
        <span className="ob-count" aria-hidden>
          <b>{pad(step)}</b> / {pad(STEPS)}
        </span>
      </div>

      <header className="ob-hero">
        <p className="ob-eyebrow">Kansai · 関西</p>
        <h1 className="ob-title">{accent(t.welcome_title)}</h1>
        <p className="ob-alt" lang={alt}>{STRINGS[alt].welcome_title}</p>
        <p className="ob-sub">{t.welcome_sub}</p>
      </header>

      <form onSubmit={start}>
        <div {...group(1)}>
          <span className="ob-n" aria-hidden>01</span>
          <div>
            <h2 className="ob-q" id="ob-q1">{t.ob_lang}</h2>
            <div className="ob-seg">
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
              <span className={`ob-select${isOther ? " on" : ""}`}>
                <span>{isOther ? STRINGS.en.languages[form.preferred_lang] : "Other"}</span>
                <select
                  aria-label="Other language"
                  value={isOther ? form.preferred_lang : ""}
                  onChange={(e) => e.target.value && set({ preferred_lang: e.target.value })}
                >
                  <option value="">Other</option>
                  {LANGS.filter((l) => !["ja", "en"].includes(l)).map((l) => (
                    <option key={l} value={l}>{STRINGS.en.languages[l]}</option>
                  ))}
                </select>
              </span>
            </div>
          </div>
        </div>

        <div {...group(2)}>
          <span className="ob-n" aria-hidden>02</span>
          <div>
            <h2 className="ob-q" id="ob-q2">{t.ob_who}</h2>
            <div className="ob-two">
              <button type="button" className={`ob-opt${form.is_local ? " on" : ""}`} aria-pressed={form.is_local} onClick={() => setLocal(true)}>
                <b>{t.ob_local}</b>
                <span className="ob-meta">地元 · local</span>
              </button>
              <button type="button" className={`ob-opt${!form.is_local ? " on" : ""}`} aria-pressed={!form.is_local} onClick={() => setLocal(false)}>
                <b>{t.ob_abroad}</b>
                <span className="ob-meta">海外から · abroad</span>
              </button>
            </div>
          </div>
        </div>

        {["speaks", "learning"].map((key, i) => (
          <div key={key} {...group(3 + i)}>
            <span className="ob-n" aria-hidden>{pad(3 + i)}</span>
            <div>
              <h2 className="ob-q" id={`ob-q${3 + i}`}>{key === "speaks" ? t.ob_speak : t.ob_learn}</h2>
              <div className="ob-tags">
                {LANGS.map((l) => (
                  <button
                    type="button"
                    key={l}
                    className={`ob-tag${form[key].includes(l) ? " on" : ""}`}
                    aria-pressed={form[key].includes(l)}
                    onClick={() => toggle(key, l)}
                  >
                    {t.languages[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div {...group(5)}>
          <span className="ob-n" aria-hidden>05</span>
          <div>
            <h2 className="ob-q" id="ob-q5">{t.ob_area}</h2>
            <div className="ob-areas">
              {AREAS.map((a) => (
                <button
                  type="button"
                  key={a}
                  className={`ob-area${form.area === a ? " on" : ""}`}
                  aria-pressed={form.area === a}
                  onClick={() => set({ area: a })}
                >
                  <span className="ob-kanji" lang="ja">{STRINGS.ja.areas[a]}</span>
                  <span className="ob-meta">{a}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div {...stepProps(6)}>
          <span className="ob-n" aria-hidden>06</span>
          <div>
            <label className="ob-q" htmlFor="ob-name">{t.ob_name}</label>
            <div className="ob-input">
              <input id="ob-name" value={form.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} />
              <button type="button" onClick={shuffle}>
                <span aria-hidden>↻ </span>
                {t.ob_shuffle}
              </button>
            </div>
            <p className="ob-hint">
              <span aria-hidden>↳ </span>
              {t.ob_name_hint}
            </p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        <button className="ob-cta" disabled={busy}>
          <span>{busy ? t.loading : t.ob_start}</span>
          <span aria-hidden>→</span>
        </button>
        <p className="ob-foot">
          {t.ob_privacy}
          <span aria-hidden>(っ˘ω˘ς )</span>
        </p>
      </form>
    </div>
  );
}
