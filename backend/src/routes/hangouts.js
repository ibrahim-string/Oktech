import { Router } from "express";
import { one, query, withTransaction } from "../db.js";
import { requireUser, viewerLang } from "../auth.js";
import { HttpError, requireFields, asStringArray } from "../http.js";
import { translate, translateFields, isSupportedLang, warm } from "../translate.js";

export const hangouts = Router();

export const CATEGORIES = [
  "language_exchange",
  "coffee",
  "food",
  "board_games",
  "sightseeing",
  "sports",
  "culture",
  "other",
];

/**
 * Hangouts with their host, participant count and whether the viewer ($1) has joined,
 * in one round trip. Callers append WHERE/ORDER clauses using params from $2.
 */
const HANGOUT_SELECT = `
  SELECT h.*,
         to_jsonb(u) AS host,
         (SELECT count(*)::int FROM hangout_participants p WHERE p.hangout_id = h.id) AS participant_count,
         EXISTS (SELECT 1 FROM hangout_participants p WHERE p.hangout_id = h.id AND p.user_id = $1) AS joined
  FROM hangouts h JOIN users u ON u.id = h.host_id`;

const publicProfile = ({ id, name, bio, area, is_local, speaks, learning, interests }) => ({
  id, name, bio, area, is_local, speaks, learning, interests,
});

/** What the viewer and the host can do for each other, language-wise. */
function languageMatch(viewer, host) {
  if (!viewer || viewer.id === host.id) return null;
  return {
    you_can_help_with: host.learning.filter((l) => viewer.speaks.includes(l)),
    you_can_practice: viewer.learning.filter((l) => host.speaks.includes(l)),
  };
}

/** Interests shared by at least two participants. */
function sharedInterests(people) {
  const counts = new Map();
  for (const p of people) {
    for (const tag of new Set(p.interests.map((i) => i.toLowerCase()))) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts].filter(([, n]) => n >= 2).map(([tag]) => tag);
}

const parseId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Hangout not found");
  return id;
};

async function getHangout(id, req) {
  const h = await one(`${HANGOUT_SELECT} WHERE h.id = $2`, [req.user?.id ?? null, parseId(id)]);
  if (!h) throw new HttpError(404, "Hangout not found");
  return h;
}

const isParticipant = async (hangoutId, userId) =>
  Boolean(await one("SELECT 1 FROM hangout_participants WHERE hangout_id = $1 AND user_id = $2", [hangoutId, userId]));

async function present(h, req) {
  const lang = viewerLang(req);
  const { title, description } = await translateFields(
    { title: h.title, description: h.description },
    lang,
  );
  return {
    ...h,
    display_lang: lang,
    title: title.text,
    description: description.text,
    original: { title: h.title, description: h.description },
    translated: title.translated || description.translated,
    host: publicProfile(h.host),
    spots_left: Math.max(0, h.max_participants - h.participant_count),
    language_match: languageMatch(req.user, h.host),
  };
}

// GET /hangouts?area=Kobe&category=coffee&lang=ja&include_past=1
hangouts.get("/", async (req, res) => {
  const params = [req.user?.id ?? null];
  const where = ["h.status = 'open'"];
  if (!req.query.include_past) where.push("h.starts_at >= now()");
  if (req.query.area) {
    params.push(req.query.area);
    where.push(`lower(h.area) = lower($${params.length})`);
  }
  if (req.query.category) {
    params.push(req.query.category);
    where.push(`h.category = $${params.length}`);
  }
  const rows = await query(
    `${HANGOUT_SELECT} WHERE ${where.join(" AND ")} ORDER BY h.starts_at LIMIT 50`,
    params,
  );
  res.json(await Promise.all(rows.map((h) => present(h, req))));
});

hangouts.get("/:id", async (req, res) => {
  const h = await getHangout(req.params.id, req);
  const people = await query(
    `SELECT u.*, p.joined_at FROM hangout_participants p
     JOIN users u ON u.id = p.user_id WHERE p.hangout_id = $1 ORDER BY p.joined_at`,
    [h.id],
  );
  res.json({
    ...(await present(h, req)),
    participants: people.map((p) => ({ ...publicProfile(p), joined_at: p.joined_at })),
    shared_interests: sharedInterests(people),
  });
});

hangouts.post("/", requireUser, async (req, res) => {
  const b = req.body;
  requireFields(b, ["title", "area", "place_name", "starts_at"]);
  const category = b.category ?? "language_exchange";
  if (!CATEGORIES.includes(category)) {
    throw new HttpError(400, `category must be one of: ${CATEGORIES.join(", ")}`);
  }
  if (Number.isNaN(Date.parse(b.starts_at))) throw new HttpError(400, "starts_at must be ISO 8601");
  const languages = asStringArray(b.languages, "languages") ?? ["ja", "en"];
  const bad = languages.filter((l) => !isSupportedLang(l));
  if (bad.length) throw new HttpError(400, `Unsupported languages: ${bad.join(", ")}`);
  const max = Number(b.max_participants ?? 4);
  if (!Number.isInteger(max) || max < 2 || max > 20) {
    throw new HttpError(400, "max_participants must be an integer from 2 to 20");
  }

  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO hangouts (host_id, title, description, category, languages, area, place_name, starts_at, max_participants)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user.id, b.title, b.description ?? "", category, JSON.stringify(languages), b.area,
        b.place_name, new Date(b.starts_at).toISOString(), max],
    );
    await client.query("INSERT INTO hangout_participants (hangout_id, user_id) VALUES ($1, $2)", [rows[0].id, req.user.id]);
    return rows[0].id;
  });

  // Warm the translation cache for the meetup's languages so the feed is instant.
  warm([b.title, b.description ?? ""], languages);
  res.status(201).json(await present(await getHangout(id, req), req));
});

hangouts.post("/:id/join", requireUser, async (req, res) => {
  const h = await getHangout(req.params.id, req);
  if (h.status !== "open") throw new HttpError(409, "This hangout is not open");
  if (!h.joined) {
    await withTransaction(async (client) => {
      // Lock the hangout row so two people can't both take the last spot.
      await client.query("SELECT 1 FROM hangouts WHERE id = $1 FOR UPDATE", [h.id]);
      const { rows } = await client.query(
        "SELECT count(*)::int AS n FROM hangout_participants WHERE hangout_id = $1",
        [h.id],
      );
      if (rows[0].n >= h.max_participants) throw new HttpError(409, "This hangout is full");
      await client.query(
        "INSERT INTO hangout_participants (hangout_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [h.id, req.user.id],
      );
    });
  }
  res.json(await present(await getHangout(h.id, req), req));
});

hangouts.delete("/:id/join", requireUser, async (req, res) => {
  const h = await getHangout(req.params.id, req);
  if (h.host_id === req.user.id) throw new HttpError(409, "The host can't leave; cancel instead");
  await query("DELETE FROM hangout_participants WHERE hangout_id = $1 AND user_id = $2", [h.id, req.user.id]);
  res.json(await present(await getHangout(h.id, req), req));
});

hangouts.post("/:id/cancel", requireUser, async (req, res) => {
  const h = await getHangout(req.params.id, req);
  if (h.host_id !== req.user.id) throw new HttpError(403, "Only the host can cancel");
  await query("UPDATE hangouts SET status = 'cancelled' WHERE id = $1", [h.id]);
  res.json(await present(await getHangout(h.id, req), req));
});

// --- Messages (small group chat per hangout, translated per viewer) ---

hangouts.get("/:id/messages", requireUser, async (req, res) => {
  const id = parseId(req.params.id);
  if (!(await isParticipant(id, req.user.id))) throw new HttpError(403, "Join the hangout first");
  const lang = viewerLang(req);
  const after = Number(req.query.after) || 0;
  const rows = await query(
    `SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.hangout_id = $1 AND m.id > $2 ORDER BY m.id LIMIT 200`,
    [id, after],
  );
  res.json(
    await Promise.all(
      rows.map(async (m) => {
        // Your own messages are shown as you wrote them.
        const t = m.sender_id === req.user.id ? { text: m.body, translated: false } : await translate(m.body, lang);
        return { ...m, text: t.text, translated: t.translated, display_lang: lang };
      }),
    ),
  );
});

hangouts.post("/:id/messages", requireUser, async (req, res) => {
  const id = parseId(req.params.id);
  if (!(await isParticipant(id, req.user.id))) throw new HttpError(403, "Join the hangout first");
  requireFields(req.body, ["body"]);
  const body = String(req.body.body).trim().slice(0, 2000);
  if (!body) throw new HttpError(400, "Message is empty");
  const m = await one(
    "INSERT INTO messages (hangout_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *",
    [id, req.user.id, body],
  );

  // Pre-translate for the other participants' languages so their next fetch is instant.
  const langs = await query(
    `SELECT DISTINCT u.preferred_lang FROM hangout_participants p JOIN users u ON u.id = p.user_id
     WHERE p.hangout_id = $1 AND p.user_id <> $2`,
    [id, req.user.id],
  );
  warm([body], langs.map((r) => r.preferred_lang));

  res.status(201).json({ ...m, sender_name: req.user.name });
});
