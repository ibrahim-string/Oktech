import { useEffect, useRef, useState } from "react";
import { navigate, useApp } from "../App.jsx";
import { api } from "../api.js";
import { timeAgo } from "../i18n.js";
import { Avatar } from "../components/Avatar.jsx";

export function Meet() {
  const { t } = useApp();
  const [waiting, setWaiting] = useState(false);
  const [others, setOthers] = useState(0);
  const [error, setError] = useState(null);
  const waitingRef = useRef(false);

  useEffect(() => {
    if (!waiting) return;
    waitingRef.current = true;
    let live = true;
    const poll = async () => {
      try {
        const r = await api.match();
        if (!live) return;
        setOthers(r.others_waiting);
        if (r.status === "matched") {
          waitingRef.current = false;
          navigate(`/c/${r.conversation_id}`);
        }
      } catch (err) {
        if (live) {
          setError(err.message);
          setWaiting(false);
        }
      }
    };
    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [waiting]);

  // Leaving the screen while waiting takes you out of the queue.
  useEffect(
    () => () => {
      if (waitingRef.current) api.cancelMatch().catch(() => {});
    },
    [],
  );

  const cancel = () => {
    waitingRef.current = false;
    setWaiting(false);
    api.cancelMatch().catch(() => {});
  };

  return (
    <div className="page">
      <section className="card meet-card">
        <div className={`dice ${waiting ? "rolling" : ""}`} aria-hidden>
          🎲
        </div>
        <h1>{waiting ? t.meet_waiting : t.meet_title}</h1>
        <p className="muted">{waiting ? t.meet_others(others) : t.meet_sub}</p>
        {waiting ? (
          <button className="btn ghost wide" onClick={cancel}>
            {t.meet_cancel}
          </button>
        ) : (
          <button
            className="btn wide big accent"
            onClick={() => {
              setError(null);
              setWaiting(true);
            }}
          >
            {t.meet_go}
          </button>
        )}
        <p className="hint">✨ {t.meet_pref}</p>
        {error && <p className="error">{error}</p>}
      </section>

      <p className="safety">🛡️ {t.meet_rules}</p>

      <ChatList />
    </div>
  );
}

export function ChatList() {
  const { t, user } = useApp();
  const [chats, setChats] = useState(null);

  useEffect(() => {
    api.conversations().then(setChats).catch(() => setChats([]));
  }, []);

  return (
    <section className="card">
      <h2>{t.my_chats}</h2>
      {chats === null && <p className="muted small">{t.loading}</p>}
      {chats?.length === 0 && <p className="muted small">{t.no_chats}</p>}
      <ul className="chat-list">
        {chats?.map((c) => (
          <li key={c.id}>
            <a href={`#/c/${c.id}`}>
              {c.partner && <Avatar user={c.partner} size={40} />}
              <div>
                <p className="name">
                  {c.partner?.name ?? "—"}
                  <span className={`tag ${c.kind === "aid" ? "aid" : "soft"}`}>{c.kind === "aid" ? "🤝" : "🎲"}</span>
                </p>
                <p className="small muted ellipsis">
                  {c.partner_left_at
                    ? t.chat_ended
                    : c.last_kind === "text"
                      ? `${c.last_sender_id === user.id ? "→ " : ""}${c.last_body}`
                      : t.no_messages}
                </p>
              </div>
              <span className="small muted when">{timeAgo(c.last_at, t)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
