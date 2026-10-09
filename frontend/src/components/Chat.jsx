import { useEffect, useRef, useState } from "react";
import { useApp } from "../App.jsx";

/**
 * Polling chat used by hangout group chats and 1:1 chats.
 * - load(after) returns messages with id > after (already translated for the viewer)
 * - send(body) posts a message and returns it
 * - onEvent(messages) lets the parent react to system events (e.g. partner left)
 */
export function Chat({ load, send, disabled, disabledText, onEvent, compact }) {
  const { t, user, contentLang } = useApp();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [original, setOriginal] = useState({});
  const lastId = useRef(0);
  const endRef = useRef(null);
  const loadRef = useRef(load);
  const onEventRef = useRef(onEvent);
  loadRef.current = load;
  onEventRef.current = onEvent;

  useEffect(() => {
    let live = true;
    lastId.current = 0;
    setMessages([]);
    const poll = async () => {
      try {
        const fresh = await loadRef.current(lastId.current);
        if (!live || !fresh.length) return;
        lastId.current = fresh[fresh.length - 1].id;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...fresh.filter((m) => !seen.has(m.id))];
        });
        onEventRef.current?.(fresh);
      } catch {
        /* keep polling; transient errors are fine */
      }
    };
    poll();
    const timer = setInterval(poll, 2500);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [contentLang]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  const submit = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const m = await send(body);
      setDraft("");
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, text: m.body, translated: false }]));
      lastId.current = Math.max(lastId.current, m.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`chat-body ${compact ? "compact" : ""}`}>
      <div className="messages" aria-live="polite">
        {messages.length === 0 && <p className="muted small center">{t.no_messages}</p>}
        {messages.map((m) => {
          if (m.kind === "left") {
            return (
              <p key={m.id} className="sys">
                {m.sender_id === user.id ? t.you_left : t.partner_left(m.sender_name ?? "")}
              </p>
            );
          }
          if (m.kind === "topic") {
            return (
              <p key={m.id} className="sys">
                💡 {m.sender_id === user.id ? t.sys_topic_me : t.sys_topic(m.sender_name)}
              </p>
            );
          }
          const mine = m.sender_id === user.id;
          const showOrig = original[m.id];
          return (
            <div key={m.id} className={`msg ${mine ? "mine" : ""}`}>
              {!mine && <span className="sender">{m.sender_name}</span>}
              <p className="bubble">{showOrig ? m.body : m.text}</p>
              {m.translated && (
                <button className="link-btn tiny" onClick={() => setOriginal((o) => ({ ...o, [m.id]: !o[m.id] }))}>
                  ✨ {showOrig ? t.show_translation : `${t.ai_translated} · ${t.show_original}`}
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {disabled ? (
        <p className="muted small center">{disabledText}</p>
      ) : (
        <form className="composer" onSubmit={submit}>
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
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

