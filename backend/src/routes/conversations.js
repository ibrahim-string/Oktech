import { Router } from "express";
import { one, query, withTransaction } from "../db.js";
import { requireUser, viewerLang, publicProfile, languageMatch } from "../auth.js";
import { HttpError, requireFields } from "../http.js";
import { presentMessages } from "../messages.js";
import { translateFields, warm } from "../translate.js";
import { TOPICS, randomTopic } from "../topics.js";

export const conversations = Router();
conversations.use(requireUser);

const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Chat not found");
  return id;
};

/** Load a conversation the viewer belongs to, with the other member. */
async function load(rawId, me) {
  const c = await one(
    `SELECT c.*, to_jsonb(u) AS partner, op.left_at AS partner_left_at, mine.left_at AS my_left_at
     FROM conversations c
     JOIN conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = $2
     LEFT JOIN conversation_members op ON op.conversation_id = c.id AND op.user_id <> $2
     LEFT JOIN users u ON u.id = op.user_id
     WHERE c.id = $1`,
    [parseId(rawId), me.id],
  );
  if (!c) throw new HttpError(404, "Chat not found");
  return c;
}

const topicFor = (i) => (i == null ? null : { index: i, ...TOPICS[i] });

// My chats, newest activity first.
conversations.get("/", async (req, res) => {
  const rows = await query(
    `SELECT c.id, c.kind, c.created_at, to_jsonb(u) AS partner, op.left_at AS partner_left_at,
            lm.body AS last_body, lm.kind AS last_kind, lm.sender_id AS last_sender_id,
            coalesce(lm.created_at, c.created_at) AS last_at
     FROM conversation_members mine
     JOIN conversations c ON c.id = mine.conversation_id
     LEFT JOIN conversation_members op ON op.conversation_id = c.id AND op.user_id <> mine.user_id
     LEFT JOIN users u ON u.id = op.user_id
     LEFT JOIN LATERAL (
       SELECT body, kind, sender_id, created_at FROM conversation_messages
       WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1
     ) lm ON true
     WHERE mine.user_id = $1 AND mine.left_at IS NULL
     ORDER BY last_at DESC LIMIT 50`,
    [req.user.id],
  );
  res.json(rows.map((r) => ({ ...r, partner: r.partner && publicProfile(r.partner) })));
});

conversations.get("/:id", async (req, res) => {
  const c = await load(req.params.id, req.user);
  let aid_post = null;
  if (c.aid_post_id) {
    const p = await one("SELECT * FROM aid_posts WHERE id = $1", [c.aid_post_id]);
    if (p) {
      const t = await translateFields({ title: p.title, body: p.body }, viewerLang(req));
      aid_post = { ...p, title: t.title.text, body: t.body.text };
    }
  }
  res.json({
    id: c.id,
    kind: c.kind,
    created_at: c.created_at,
    topic: topicFor(c.topic),
    partner: c.partner && publicProfile(c.partner),
    partner_left: Boolean(c.partner_left_at),
    language_match: c.partner && languageMatch(req.user, c.partner),
    aid_post,
  });
});

conversations.get("/:id/messages", async (req, res) => {
  const c = await load(req.params.id, req.user);
  const rows = await query(
    `SELECT m.*, u.name AS sender_name FROM conversation_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1 AND m.id > $2 ORDER BY m.id LIMIT 200`,
    [c.id, Number(req.query.after) || 0],
  );
  res.json(await presentMessages(rows, req.user.id, viewerLang(req)));
});

conversations.post("/:id/messages", async (req, res) => {
  const c = await load(req.params.id, req.user);
  if (c.my_left_at || c.partner_left_at) throw new HttpError(409, "This chat has ended");
  requireFields(req.body, ["body"]);
  const body = String(req.body.body).trim().slice(0, 2000);
  if (!body) throw new HttpError(400, "Message is empty");
  const m = await one(
    "INSERT INTO conversation_messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *",
    [c.id, req.user.id, body],
  );
  if (c.partner) warm([body], [c.partner.preferred_lang]);
  res.status(201).json({ ...m, sender_name: req.user.name, text: body, translated: false });
});

// Swap the icebreaker for a new random one (shown to both people).
conversations.post("/:id/topic", async (req, res) => {
  const c = await load(req.params.id, req.user);
  const topic = randomTopic(c.topic);
  await query("UPDATE conversations SET topic = $1 WHERE id = $2", [topic, c.id]);
  await query(
    "INSERT INTO conversation_messages (conversation_id, sender_id, kind, body) VALUES ($1, $2, 'topic', $3)",
    [c.id, req.user.id, String(topic)],
  );
  res.json({ topic: topicFor(topic) });
});

async function leave(c, me) {
  if (c.my_left_at) return;
  await query("UPDATE conversation_members SET left_at = now() WHERE conversation_id = $1 AND user_id = $2", [c.id, me.id]);
  await query(
    "INSERT INTO conversation_messages (conversation_id, sender_id, kind) VALUES ($1, $2, 'left')",
    [c.id, me.id],
  );
}

conversations.post("/:id/leave", async (req, res) => {
  await leave(await load(req.params.id, req.user), req.user);
  res.json({ ok: true });
});

// Report = record it, block them (no future matches), and leave the chat.
conversations.post("/:id/report", async (req, res) => {
  const c = await load(req.params.id, req.user);
  if (!c.partner) throw new HttpError(409, "Nobody to report");
  await query(
    "INSERT INTO reports (reporter_id, reported_id, conversation_id, reason) VALUES ($1, $2, $3, $4)",
    [req.user.id, c.partner.id, c.id, String(req.body?.reason ?? "").slice(0, 500)],
  );
  await query("INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.user.id, c.partner.id]);
  await leave(c, req.user);
  res.json({ ok: true });
});

// --- Random matching ---------------------------------------------------------

export const match = Router();
match.use(requireUser);

/** Waiting entries older than this (no poll) are considered gone. */
const STALE = "20 seconds";

/**
 * Join the queue, or check on it. Clients call this every couple of seconds while waiting.
 * Pairs you with someone else waiting, preferring a language swap (they learn what you
 * speak and vice versa) and a local/foreign-resident mix. Blocked pairs never match.
 */
match.post("/", async (req, res) => {
  const me = req.user;
  const result = await withTransaction(async (c) => {
    const { rows: [self] } = await c.query(
      `INSERT INTO match_queue (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET last_seen = now()
       RETURNING matched_conversation_id`,
      [me.id],
    );
    if (self.matched_conversation_id) {
      await c.query("DELETE FROM match_queue WHERE user_id = $1", [me.id]);
      return { status: "matched", conversation_id: self.matched_conversation_id };
    }

    const { rows: [partner] } = await c.query(
      `SELECT q.user_id FROM match_queue q JOIN users u ON u.id = q.user_id
       WHERE q.user_id <> $1
         AND q.matched_conversation_id IS NULL
         AND q.last_seen > now() - interval '${STALE}'
         AND NOT EXISTS (SELECT 1 FROM blocks b
                         WHERE (b.blocker_id = $1 AND b.blocked_id = q.user_id)
                            OR (b.blocker_id = q.user_id AND b.blocked_id = $1))
       ORDER BY ((u.learning ?| $2::text[])::int + (u.speaks ?| $3::text[])::int
                 + (u.is_local <> $4)::int) DESC,
                q.created_at
       LIMIT 1
       FOR UPDATE OF q SKIP LOCKED`,
      [me.id, me.speaks, me.learning, me.is_local],
    );
    if (!partner) return { status: "waiting" };

    const topic = randomTopic();
    const { rows: [conv] } = await c.query(
      "INSERT INTO conversations (kind, topic) VALUES ('random', $1) RETURNING id",
      [topic],
    );
    await c.query(
      "INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)",
      [conv.id, me.id, partner.user_id],
    );
    // They find out on their next poll.
    await c.query("UPDATE match_queue SET matched_conversation_id = $1 WHERE user_id = $2", [conv.id, partner.user_id]);
    await c.query("DELETE FROM match_queue WHERE user_id = $1", [me.id]);
    return { status: "matched", conversation_id: conv.id };
  });

  const waiting = await one(
    `SELECT count(*)::int AS n FROM match_queue
     WHERE matched_conversation_id IS NULL AND last_seen > now() - interval '${STALE}' AND user_id <> $1`,
    [me.id],
  );
  res.json({ ...result, others_waiting: waiting.n });
});

match.delete("/", async (req, res) => {
  await query("DELETE FROM match_queue WHERE user_id = $1 AND matched_conversation_id IS NULL", [req.user.id]);
  res.json({ ok: true });
});
