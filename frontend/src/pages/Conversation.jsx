import { useCallback, useEffect, useState } from "react";
import { navigate, useApp } from "../App.jsx";
import { api } from "../api.js";
import { listLangs } from "../i18n.js";
import { Avatar } from "../components/Avatar.jsx";
import { MatchChips } from "../components/HangoutCard.jsx";
import { Chat } from "../components/Chat.jsx";

/** A 1:1 chat: a random match or a reply to an aid post. */
export function Conversation({ id }) {
  const { t, lang, user, contentLang } = useApp();
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [ended, setEnded] = useState(false);

  const load = useCallback(
    () =>
      api
        .conversation(id)
        .then((data) => {
          setC(data);
          if (data.partner_left) setEnded(true);
        })
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load, contentLang]);

  if (error && !c) return <p className="error page">{error}</p>;
  if (!c) return <p className="muted center page">{t.loading}</p>;

  const p = c.partner;
  const topic = c.topic?.[lang === "ja" ? "ja" : "en"];
  const otherTopic = c.topic?.[lang === "ja" ? "en" : "ja"];

  const onEvent = (msgs) => {
    if (msgs.some((m) => m.kind === "left")) {
      setEnded(true);
    }
    if (msgs.some((m) => m.kind === "topic")) load();
  };

  const leave = async () => {
    await api.leaveConversation(c.id).catch(() => {});
    navigate(c.kind === "random" ? "/meet" : "/help");
  };

  const sendReport = async () => {
    try {
      await api.report(c.id, reason);
      navigate("/meet");
    } catch (e) {
      setError(e.message);
      setReporting(false);
    }
  };

  return (
    <div className="page convo">
      <a href={c.kind === "aid" ? "#/help" : "#/meet"} className="back">← {t.back}</a>

      {p && (
        <section className="card partner">
          <Avatar user={p} size={52} />
          <div>
            <h1 className="h2">{p.name}</h1>
            <p className="small muted">
              {p.is_local ? t.local : t.resident} · {t.areas[p.area] ?? p.area}
            </p>
            <p className="small">
              <span className="muted">{t.speaks}:</span> {listLangs(p.speaks, t)}
              {p.learning.length > 0 && (
                <>
                  {" · "}
                  <span className="muted">{t.learning}:</span> {listLangs(p.learning, t)}
                </>
              )}
            </p>
            <MatchChips match={c.language_match} />
          </div>
        </section>
      )}

      {c.aid_post && (
        <section className="card aid-context">
          <p className="eyebrow">{t.about_post}</p>
          <h3>{c.aid_post.title}</h3>
          {c.aid_post.body && <p className="small">{c.aid_post.body}</p>}
        </section>
      )}

      {c.topic && (
        <section className="topic-card">
          <p className="eyebrow">💡 {t.topic}</p>
          <p className="topic-main">{topic}</p>
          <p className="topic-sub">{otherTopic}</p>
          {!ended && (
            <button className="link-btn" onClick={() => api.newTopic(c.id).then(load)}>
              🔄 {t.new_topic}
            </button>
          )}
        </section>
      )}

      <section className="card chat">
        <Chat
          key={`${c.id}-${user.id}`}
          load={(after) => api.conversationMessages(c.id, after)}
          send={(body) => api.sendConversationMessage(c.id, body)}
          disabled={ended}
          disabledText={t.chat_ended}
          onEvent={onEvent}
        />
      </section>

      {error && <p className="error">{error}</p>}
      {ended ? (
        c.kind === "random" && (
          <button className="btn wide accent" onClick={() => navigate("/meet")}>
            🎲 {t.meet_again}
          </button>
        )
      ) : (
        <div className="convo-actions">
          <button className="btn ghost small" onClick={leave}>
            {t.end_chat}
          </button>
          <button className="btn ghost small danger" onClick={() => setReporting(true)}>
            🚩 {t.report}
          </button>
        </div>
      )}

      {reporting && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="card sheet-card">
            <h2 id="report-title">{t.report_title}</h2>
            <p className="small muted">{t.report_body}</p>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <div className="convo-actions">
              <button className="btn ghost small" onClick={() => setReporting(false)}>
                {t.cancel}
              </button>
              <button className="btn small danger-solid" onClick={sendReport}>
                {t.report_send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
