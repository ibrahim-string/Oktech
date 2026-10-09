import { useEffect, useState } from "react";
import { navigate, useApp } from "../App.jsx";
import { api } from "../api.js";
import { timeAgo } from "../i18n.js";
import { NUMBERS, APPS, TIPS, PHRASES, WORDS } from "../emergency.js";
import { Avatar } from "../components/Avatar.jsx";
import { EmergencyBanner } from "../components/EmergencyBanner.jsx";

const AID_ICONS = {
  interpreting: "🗣️",
  supplies: "📦",
  shelter: "🏠",
  transport: "🚗",
  info: "ℹ️",
  check_on: "👋",
  other: "🤝",
};

export function Help() {
  const { t, safety, reloadSafety } = useApp();
  useEffect(() => {
    reloadSafety();
  }, [reloadSafety]);

  const emergency = safety?.emergency;
  return (
    <div className="page">
      <section className="hero compact">
        <h1>🤝 {t.help_title}</h1>
        <p className="muted">{t.help_sub}</p>
      </section>

      {emergency ? (
        <>
          <EmergencyBanner full />
          <CheckIn />
          <AidBoard />
          <Essentials />
          <Quakes />
        </>
      ) : (
        <>
          <p className="all-clear">✅ {t.all_clear}</p>
          <AidBoard />
          <Essentials />
          <Quakes />
        </>
      )}
    </div>
  );
}

function CheckIn() {
  const { t, user, safety, reloadSafety } = useApp();
  const [busy, setBusy] = useState(false);
  const mine = safety?.my_checkin?.status;

  const checkin = async (status) => {
    setBusy(true);
    try {
      await api.checkin(status);
      await reloadSafety();
    } finally {
      setBusy(false);
    }
  };

  const counts = (safety?.checkins ?? []).filter((c) => c.area === user.area);
  const safeN = counts.find((c) => c.status === "safe")?.n ?? 0;
  const needN = counts.find((c) => c.status === "need_help")?.n ?? 0;

  return (
    <section className="card checkin">
      <h2>{t.checkin_q}</h2>
      <div className="seg two">
        <button className={`ok ${mine === "safe" ? "on" : ""}`} disabled={busy} onClick={() => checkin("safe")}>
          ✅ {t.im_safe}
        </button>
        <button className={`sos ${mine === "need_help" ? "on" : ""}`} disabled={busy} onClick={() => checkin("need_help")}>
          🆘 {t.need_help}
        </button>
      </div>
      {mine === "safe" && <p className="ok">{t.checked_safe}</p>}
      {mine === "need_help" && (
        <p className="small">
          {t.checked_need}{" "}
          <a className="link" href="#/help/new?kind=need">{t.aid_post_btn} →</a>
        </p>
      )}
      <p className="small muted">
        {t.safe_count(safeN, t.areas[user.area] ?? user.area)}
        {needN > 0 && ` · ${t.need_count(needN)}`}
      </p>
    </section>
  );
}

function AidBoard() {
  const { t, contentLang } = useApp();
  const [kind, setKind] = useState("");
  const [posts, setPosts] = useState(null);
  const [showOriginal, setShowOriginal] = useState({});
  const [error, setError] = useState(null);

  const load = () =>
    api
      .aid({ kind })
      .then(setPosts)
      .catch((e) => setError(e.message));
  useEffect(() => {
    setPosts(null);
    load();
  }, [kind, contentLang]);

  const message = async (p) => {
    try {
      const { conversation_id } = await api.respondAid(p.id);
      navigate(`/c/${conversation_id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const resolve = async (p) => {
    await api.resolveAid(p.id).catch(() => {});
    load();
  };

  return (
    <section className="card">
      <div className="section-head">
        <h2>{t.aid_board}</h2>
        <a className="btn small accent" href="#/help/new">＋ {t.aid_post_btn}</a>
      </div>
      <div className="filters inline" role="group" aria-label={t.aid_board}>
        {[
          ["", t.all],
          ["need", `🆘 ${t.aid_need}`],
          ["offer", `💪 ${t.aid_offer}`],
        ].map(([k, label]) => (
          <button key={k} className={`pill ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {posts === null && <p className="muted small">{t.loading}</p>}
      {posts?.length === 0 && <p className="muted small">{t.aid_empty}</p>}
      <ul className="aid-list">
        {posts?.map((p) => {
          const orig = showOriginal[p.id];
          return (
            <li key={p.id} className={`aid ${p.kind}`}>
              <div className="aid-top">
                <span className={`aid-kind ${p.kind}`}>{p.kind === "need" ? `🆘 ${t.aid_need}` : `💪 ${t.aid_offer}`}</span>
                <span className="small muted">
                  {AID_ICONS[p.category]} {t.aid_categories[p.category]} · {t.areas[p.area] ?? p.area} · {timeAgo(p.created_at, t)}
                </span>
              </div>
              <h3>{orig ? p.original.title : p.title}</h3>
              {(orig ? p.original.body : p.body) && <p className="small">{orig ? p.original.body : p.body}</p>}
              {p.translated && (
                <button className="link-btn tiny" onClick={() => setShowOriginal((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                  ✨ {t.ai_translated} · {orig ? t.show_translation : t.show_original}
                </button>
              )}
              <div className="aid-foot">
                <span className="host">
                  <Avatar user={p.author} size={22} /> {p.author.name}
                </span>
                {p.mine ? (
                  <button className="btn ghost small" onClick={() => resolve(p)}>
                    ✓ {t.aid_resolve}
                  </button>
                ) : (
                  <button className="btn small" onClick={() => message(p)}>
                    💬 {t.aid_message}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Essentials() {
  const { t, lang } = useApp();
  const L = lang === "ja" ? "ja" : "en";
  return (
    <section className="card essentials">
      <h2>🧯 {t.essentials}</h2>
      <ul className="numbers">
        {NUMBERS.map((n) => (
          <li key={n.number}>
            <a href={`tel:${n.number.replace(/-/g, "")}`} className="number">{n.number}</a>
            <span className="small">{n[L]}</span>
          </li>
        ))}
      </ul>

      {Object.entries(TIPS).map(([kind, tip]) => (
        <details key={kind} className="tip">
          <summary>
            {tip.icon} {t.alert_kinds[kind]}
          </summary>
          <ul>
            {tip[L].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ))}

      <details className="tip">
        <summary>🗣️ {t.phrases}</summary>
        <ul className="phrases">
          {PHRASES.map((p) => (
            <li key={p.ja}>
              <strong lang="ja">{p.ja}</strong>
              <span className="small muted">{p.romaji}</span>
              <span className="small">{p.en}</span>
            </li>
          ))}
        </ul>
        <ul className="words">
          {WORDS.map((w) => (
            <li key={w.ja}>
              <strong lang="ja">{w.ja}</strong> <span className="small muted">{w.romaji}</span> <span className="small">{w.en}</span>
            </li>
          ))}
        </ul>
      </details>

      <ul className="apps small">
        {APPS.map((a) => (
          <li key={a.name}>
            📱 <strong>{a.name}</strong>: {a[L]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Quakes() {
  const { t, lang, safety } = useApp();
  const quakes = safety?.quakes ?? [];
  const fmt = (iso) =>
    new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-GB", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo",
    }).format(new Date(iso));

  return (
    <section className="card">
      <h2>🌏 {t.recent_quakes}</h2>
      {quakes.length === 0 && <p className="muted small">{safety ? t.no_quakes : t.loading}</p>}
      <ul className="quakes">
        {quakes.map((q) => (
          <li key={q.id}>
            <span className={`shindo s${(q.max_shindo ?? "?").replace(/[+-]/, "")}`} title={t.intensity}>
              {q.max_shindo ?? "?"}
            </span>
            <div>
              <p className="name">{q.place}</p>
              <p className="small muted">
                {fmt(q.time)}
                {q.magnitude && ` · M${q.magnitude}`}
                {q.kansai.length > 0 &&
                  ` · ${t.felt_in}: ${q.kansai.map((k) => `${t.areas[k.area] ?? k.area} ${k.shindo}`).join(", ")}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="hint">{t.quake_source}</p>
    </section>
  );
}
