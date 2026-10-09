import { useApp } from "../App.jsx";
import { CATEGORY_ICONS, formatWhen } from "../i18n.js";
import { Avatar } from "./Avatar.jsx";

/** Chips showing how the viewer and the host can help each other with languages. */
export function MatchChips({ match }) {
  const { t } = useApp();
  if (!match) return null;
  const chips = [
    ...match.you_can_help_with.map((l) => ({ key: `h-${l}`, cls: "chip-help", text: t.you_help(t.languages[l] ?? l) })),
    ...match.you_can_practice.map((l) => ({ key: `p-${l}`, cls: "chip-practice", text: t.you_practice(t.languages[l] ?? l) })),
  ];
  if (!chips.length) return null;
  return (
    <div className="chips">
      {chips.map((c) => (
        <span key={c.key} className={`chip ${c.cls}`}>
          {c.text}
        </span>
      ))}
    </div>
  );
}

export function LanguagePair({ languages }) {
  const { t } = useApp();
  return (
    <span className="lang-pair">
      {languages.map((l) => t.languages[l] ?? l).join(" ⇄ ")}
    </span>
  );
}

export function HangoutCard({ h }) {
  const { t, lang } = useApp();
  return (
    <a href={`#/h/${h.id}`} className="card hangout-card">
      <div className="card-top">
        <span className="cat">
          <span aria-hidden>{CATEGORY_ICONS[h.category]}</span> {t.categories[h.category]}
        </span>
        <span className={`spots ${h.spots_left === 0 ? "is-full" : ""}`}>
          {h.spots_left === 0 ? t.full : t.spots_left(h.spots_left)}
        </span>
      </div>
      <h3>{h.title}</h3>
      <p className="meta">
        <span>📅 {formatWhen(h.starts_at, lang)}</span>
        <span>📍 {t.areas[h.area] ?? h.area} · {h.place_name}</span>
      </p>
      <MatchChips match={h.language_match} />
      <div className="card-foot">
        <span className="host">
          <Avatar user={h.host} size={24} />
          {t.hosted_by} <strong>{h.host.name}</strong>
        </span>
        <LanguagePair languages={h.languages} />
      </div>
    </a>
  );
}
