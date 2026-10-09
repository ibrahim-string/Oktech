import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../api.js";
import { CATEGORY_ICONS, formatWhen, listLangs } from "../i18n.js";
import { Avatar } from "../components/Avatar.jsx";
import { LanguagePair, MatchChips } from "../components/HangoutCard.jsx";

export function HangoutDetail({ id }) {
  const { t, lang, user, contentLang } = useApp();
  const [h, setH] = useState(null);
  const [error, setError] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api.hangout(id).then(setH).catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load, contentLang]);

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !h) return <p className="error page">{error}</p>;
  if (!h) return <p className="muted center page">{t.loading}</p>;

  const isHost = h.host.id === user.id;
  const title = showOriginal ? h.original.title : h.title;
  const description = showOriginal ? h.original.description : h.description;

  return (
    <div className="page detail">
      <a href="#/" className="back">← {t.back}</a>

      <section className="card detail-head">
        <div className="card-top">
          <span className="cat">
            <span aria-hidden>{CATEGORY_ICONS[h.category]}</span> {t.categories[h.category]}
          </span>
          <LanguagePair languages={h.languages} />
        </div>
        <h1>{title}</h1>
        {description && <p className="desc">{description}</p>}
        {h.translated && (
          <button className="link-btn" onClick={() => setShowOriginal((v) => !v)}>
            ✨ {t.ai_translated} · {showOriginal ? t.show_translation : t.show_original}
          </button>
        )}
        <dl className="facts">
          <div>
            <dt>📅</dt>
            <dd>{formatWhen(h.starts_at, lang)}</dd>
          </div>
          <div>
            <dt>📍</dt>
            <dd>
              {h.place_name} · {t.areas[h.area] ?? h.area}
            </dd>
          </div>
          <div>
            <dt>👥</dt>
            <dd>
              {t.going(h.participant_count)} · {h.spots_left === 0 ? t.full : t.spots_left(h.spots_left)}
            </dd>
          </div>
        </dl>

        <MatchChips match={h.language_match} />

        {isHost ? (
          <p className="status-line">⭐ {t.hosting}</p>
        ) : h.joined ? (
          <div className="joined-row">
            <p className="status-line">✅ {t.joined}</p>
            <button className="btn ghost small" disabled={busy} onClick={() => act(api.leave)}>
              {t.leave}
            </button>
          </div>
        ) : (
          <button className="btn wide" disabled={busy || h.spots_left === 0} onClick={() => act(api.join)}>
            {h.spots_left === 0 ? t.full : t.join}
          </button>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>{t.participants}</h2>
        <ul className="people">
          {h.participants.map((p) => (
            <li key={p.id}>
              <Avatar user={p} size={40} />
              <div>
                <p className="name">
                  {p.name}
                  {p.id === h.host.id && <span className="tag">{t.hosted_by}</span>}
                  {p.id === user.id && <span className="tag soft">{t.you}</span>}
                </p>
                <p className="small muted">
                  {p.is_local ? t.local : t.resident} · {t.areas[p.area] ?? p.area}
                </p>
                <p className="small">
                  <span className="muted">{t.speaks}:</span> {listLangs(p.speaks, t)}
                  {"  "}
                  <span className="muted">{t.learning}:</span> {listLangs(p.learning, t)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {h.shared_interests.length > 0 && (
          <>
            <h3 className="sub">{t.shared_interests}</h3>
            <div className="chips">
              {h.shared_interests.map((i) => (
                <span key={i} className="chip chip-interest">
                  {i}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <p className="safety">🛡️ {t.safety}</p>

      <Chat hangoutId={h.id} enabled={h.joined || isHost} />
    </div>
  );
}

function Chat({ hangoutId, enabled }) {
  const { t, user, contentLang } = useApp();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [original, setOriginal] = useState({});
  const lastId = useRef(0);
  const endRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    lastId.current = 0;
    setMessages([]);
    const poll = async () => {
      try {
        const fresh = await api.messages(hangoutId, lastId.current);
        if (!live || !fresh.length) return;
        lastId.current = fresh[fresh.length - 1].id;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...fresh.filter((m) => !seen.has(m.id))];
        });
      } catch {
        /* keep polling; transient errors are fine in a demo */
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [hangoutId, enabled, contentLang]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setSendError(null);
    try {
      const m = await api.sendMessage(hangoutId, body);
      setDraft("");
      setMessages((prev) => [...prev, { ...m, text: m.body, translated: false }]);
      lastId.current = Math.max(lastId.current, m.id);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card chat">
      <h2>💬 {t.chat}</h2>
      {!enabled ? (
        <p className="muted">{t.chat_locked}</p>
      ) : (
        <>
          <div className="messages">
            {messages.length === 0 && <p className="muted small center">{t.no_messages}</p>}
            {messages.map((m) => {
              const mine = m.sender_id === user.id;
              const showOrig = original[m.id];
              return (
                <div key={m.id} className={`msg ${mine ? "mine" : ""}`}>
                  {!mine && <span className="sender">{m.sender_name}</span>}
                  <p className="bubble">{showOrig ? m.body : m.text}</p>
                  {m.translated && (
                    <button
                      className="link-btn tiny"
                      onClick={() => setOriginal((o) => ({ ...o, [m.id]: !o[m.id] }))}
                    >
                      ✨ {showOrig ? t.show_translation : `${t.ai_translated} · ${t.show_original}`}
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form className="composer" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.chat_placeholder}
              aria-label={t.chat_placeholder}
              maxLength={2000}
            />
            <button className="btn" disabled={sending || !draft.trim()}>
              {t.send}
            </button>
          </form>
          {sendError && <p className="error">{sendError}</p>}
        </>
      )}
    </section>
  );
}
