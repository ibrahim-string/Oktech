import { useEffect, useState } from "react";
import { navigate, useApp } from "../App.jsx";
import { api } from "../api.js";
import { AREAS, CATEGORY_ICONS } from "../i18n.js";
import { HangoutCard } from "../components/HangoutCard.jsx";

export function Feed() {
  const { t, user, contentLang } = useApp();
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setItems(null);
    setError(null);
    api
      .feed({ area, category, lang: contentLang })
      .then((data) => live && setItems(data))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [area, category, contentLang]);

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow">{t.tagline}</p>
        <h1>{t.feed_title}</h1>
        <p className="muted">{t.feed_sub}</p>
      </section>

      <a href="#/meet" className="card promo">
        <span className="promo-dice" aria-hidden>🎲</span>
        <span>
          <strong>{t.meet_promo_title}</strong>
          <span className="small muted">{t.meet_promo_sub}</span>
        </span>
        <span aria-hidden>→</span>
      </a>

      <div className="feed-actions">
        <button
          className="btn ghost small"
          onClick={() => {
            const open = (items ?? []).filter((h) => h.spots_left > 0 && !h.joined);
            if (!open.length) return setError(t.surprise_none);
            navigate(`/h/${open[Math.floor(Math.random() * open.length)].id}`);
          }}
        >
          🔀 {t.surprise}
        </button>
        <a className="btn small" href="#/new">＋ {t.new_hangout}</a>
      </div>

      <div className="filters" role="group" aria-label={t.f_area}>
        <button className={`pill ${area === "" ? "on" : ""}`} onClick={() => setArea("")}>
          {t.all_areas}
        </button>
        {AREAS.map((a) => (
          <button key={a} className={`pill ${area === a ? "on" : ""}`} onClick={() => setArea(a)}>
            {t.areas[a]}
            {a === user.area ? " •" : ""}
          </button>
        ))}
      </div>
      <div className="filters" role="group" aria-label={t.f_category}>
        <button className={`pill ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>
          {t.all}
        </button>
        {Object.keys(CATEGORY_ICONS).map((c) => (
          <button key={c} className={`pill ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>
            {CATEGORY_ICONS[c]} {t.categories[c]}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {!items && !error && <p className="muted center">{t.loading}</p>}
      {items?.length === 0 && (
        <div className="empty">
          <p>{t.empty_feed}</p>
          <a className="btn" href="#/new">{t.new_hangout}</a>
        </div>
      )}
      <div className="list">
        {items?.map((h) => (
          <HangoutCard key={h.id} h={h} />
        ))}
      </div>
    </div>
  );
}
