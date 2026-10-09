import { Router } from "express";
import { db, parseRow } from "../db.js";
import { requireUser, viewerLang } from "../auth.js";
import { HttpError, requireFields, asStringArray } from "../http.js";
import { translate, translateFields, isSupportedLang } from "../translate.js";

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

const selectHangout = db.prepare("SELECT * FROM hangouts WHERE id = ?");
const selectUser = db.prepare("SELECT * FROM users WHERE id = ?");
const selectParticipants = db.prepare(
  `SELECT u.*, p.joined_at FROM hangout_participants p
   JOIN users u ON u.id = p.user_id WHERE p.hangout_id = ? ORDER BY p.joined_at`,
);
const countParticipants = db.prepare(
  "SELECT COUNT(*) AS n FROM hangout_participants WHERE hangout_id = ?",
);
const isParticipant = db.prepare(
  "SELECT 1 FROM hangout_participants WHERE hangout_id = ? AND user_id = ?",
);
const insertParticipant = db.prepare(
  "INSERT OR IGNORE INTO hangout_participants (hangout_id, user_id) VALUES (?, ?)",
);

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

function getHangoutOr404(id) {
  const h = parseRow(selectHangout.get(Number(id)));
  if (!h) throw new HttpError(404, "Hangout not found");
  return h;
}

async function present(h, req) {
  const lang = viewerLang(req);
  const host = parseRow(selectUser.get(h.host_id));
  const { title, description } = await translateFields(
    { title: h.title, description: h.description },
    lang,
  );
  const joined = countParticipants.get(h.id).n;
  return {
    ...h,
    display_lang: lang,
    title: title.text,
    description: description.text,
    original: { title: h.title, description: h.description },
    translated: title.translated || description.translated,
    host: publicProfile(host),
    participant_count: joined,
    spots_left: Math.max(0, h.max_participants - joined),
    joined: req.user ? Boolean(isParticipant.get(h.id, req.user.id)) : false,
    language_match: languageMatch(req.user, host),
  };
}

// GET /hangouts?area=Kobe&category=coffee&lang=ja&include_past=1
hangouts.get("/", async (req, res) => {
  const where = ["status = 'open'"];
  const params = [];
  if (!req.query.include_past) where.push("starts_at >= datetime('now')");
  if (req.query.area) {
    where.push("area = ? COLLATE NOCASE");
    params.push(req.query.area);
  }
  if (req.query.category) {
    where.push("category = ?");
    params.push(req.query.category);
  }
  const rows = db
    .prepare(`SELECT * FROM hangouts WHERE ${where.join(" AND ")} ORDER BY starts_at LIMIT 50`)
    .all(...params)
    .map(parseRow);
  res.json(await Promise.all(rows.map((h) => present(h, req))));
});

hangouts.get("/:id", async (req, res) => {
  const h = getHangoutOr404(req.params.id);
  const people = selectParticipants.all(h.id).map(parseRow);
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

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO hangouts (host_id, title, description, category, languages, area, place_name, starts_at, max_participants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      req.user.id,
      b.title,
      b.description ?? "",
      category,
      JSON.stringify(languages),
      b.area,
      b.place_name,
      new Date(b.starts_at).toISOString(),
      max,
    );
  insertParticipant.run(lastInsertRowid, req.user.id);

  const h = parseRow(selectHangout.get(lastInsertRowid));
  // Warm the translation cache for the meetup's languages so the feed is instant.
  for (const lang of languages) translateFields({ title: h.title, description: h.description }, lang);
  res.status(201).json(await present(h, req));
});

hangouts.post("/:id/join", requireUser, async (req, res) => {
  const h = getHangoutOr404(req.params.id);
  if (h.status !== "open") throw new HttpError(409, "This hangout is not open");
  if (!isParticipant.get(h.id, req.user.id)) {
    if (countParticipants.get(h.id).n >= h.max_participants) {
      throw new HttpError(409, "This hangout is full");
    }
    insertParticipant.run(h.id, req.user.id);
  }
  res.json(await present(h, req));
});

hangouts.delete("/:id/join", requireUser, async (req, res) => {
  const h = getHangoutOr404(req.params.id);
  if (h.host_id === req.user.id) throw new HttpError(409, "The host can't leave; cancel instead");
  db.prepare("DELETE FROM hangout_participants WHERE hangout_id = ? AND user_id = ?").run(
    h.id,
    req.user.id,
  );
  res.json(await present(h, req));
});

hangouts.post("/:id/cancel", requireUser, async (req, res) => {
  const h = getHangoutOr404(req.params.id);
  if (h.host_id !== req.user.id) throw new HttpError(403, "Only the host can cancel");
  db.prepare("UPDATE hangouts SET status = 'cancelled' WHERE id = ?").run(h.id);
  res.json(await present(getHangoutOr404(h.id), req));
});

// --- Messages (small group chat per hangout, translated per viewer) ---

hangouts.get("/:id/messages", requireUser, async (req, res) => {
  const h = getHangoutOr404(req.params.id);
  if (!isParticipant.get(h.id, req.user.id)) throw new HttpError(403, "Join the hangout first");
  const lang = viewerLang(req);
  const after = Number(req.query.after ?? 0);
  const rows = db
    .prepare(
      `SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.hangout_id = ? AND m.id > ? ORDER BY m.id LIMIT 200`,
    )
    .all(h.id, after);
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
  const h = getHangoutOr404(req.params.id);
  if (!isParticipant.get(h.id, req.user.id)) throw new HttpError(403, "Join the hangout first");
  requireFields(req.body, ["body"]);
  const body = String(req.body.body).trim().slice(0, 2000);
  const { lastInsertRowid } = db
    .prepare("INSERT INTO messages (hangout_id, sender_id, body) VALUES (?, ?, ?)")
    .run(h.id, req.user.id, body);

  // Pre-translate for the other participants' languages so their next fetch is instant.
  const langs = new Set(
    selectParticipants
      .all(h.id)
      .map(parseRow)
      .filter((p) => p.id !== req.user.id)
      .map((p) => p.preferred_lang),
  );
  for (const lang of langs) translate(body, lang);

  const m = db.prepare("SELECT * FROM messages WHERE id = ?").get(lastInsertRowid);
  res.status(201).json({ ...m, sender_name: req.user.name });
});
