import { useApp } from "../App.jsx";

const ICONS = { earthquake: "🌏", flood: "🌊", typhoon: "🌀", tsunami: "🌊", other: "⚠️" };

/** Text for one alert in the viewer's language (auto quake alerts are built client-side). */
export function alertText(a, t) {
  if (a.auto) {
    return {
      title: `${t.alert_kinds.earthquake} · ${t.areas[a.area] ?? a.area}`,
      message: [t.auto_quake(t.areas[a.area] ?? a.area, a.shindo), a.tsunami && t.tsunami_alert].filter(Boolean).join(" "),
    };
  }
  return { title: a.title, message: a.message };
}

export function EmergencyBanner({ full }) {
  const { t, safety } = useApp();
  if (!safety?.emergency) return null;
  return (
    <div className={`emergency ${full ? "full" : ""}`} role="alert">
      {safety.alerts.map((a) => {
        const { title, message } = alertText(a, t);
        return (
          <div key={a.id} className="emergency-item">
            <p className="emergency-title">
              <span aria-hidden>{ICONS[a.kind] ?? "⚠️"}</span> {t.emergency}: {title}
              {a.area && !a.auto && <span className="emergency-area"> · {t.areas[a.area] ?? a.area}</span>}
            </p>
            {message && <p className="emergency-msg">{message}</p>}
          </div>
        );
      })}
      {!full && (
        <a className="emergency-link" href="#/help">
          {t.see_help} →
        </a>
      )}
    </div>
  );
}
