import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { one, query } from "../db.js";
import { requireUser, viewerLang, publicProfile } from "../auth.js";
import { HttpError, requireFields } from "../http.js";
import { translate, translateFields, warm } from "../translate.js";
import { recentQuakes, STRONG_SHAKING } from "../quakes.js";

export const safety = Router();

export const ALERT_KINDS = ["earthquake", "flood", "typhoon", "tsunami", "other"];
export const AID_CATEGORIES = ["interpreting", "supplies", "shelter", "transport", "info", "check_on", "other"];
const DAY_MS = 24 * 3600 * 1000;

/**
 * Everything the Help screen needs: active alerts (manual + automatic from strong
 * shaking in Kansai), recent quakes, and today's check-in counts per area.
 */
safety.get("/", async (req, res) => {
  const lang = viewerLang(req);
  const [manual, quakes, checkins, mine] = await Promise.all([
    query("SELECT * FROM alerts WHERE active ORDER BY created_at DESC"),
    recentQuakes(),
    query(
      `SELECT area, status, count(*)::int AS n FROM safety_checkins
       WHERE updated_at > now() - interval '24 hours' GROUP BY area, status`,
    ),
    req.user ? one("SELECT status, updated_at FROM safety_checkins WHERE user_id = $1", [req.user.id]) : null,
  ]);

  const alerts = await Promise.all(
    manual.map(async (a) => {
      const t = await translateFields({ title: a.title, message: a.message }, lang);
      return { ...a, title: t.title.text, message: t.message.text, auto: false };
    }),
  );

  // Automatic alert: shindo 5- or stronger anywhere in Kansai in the last 24 hours.
  const strong = quakes.filter(
    (q) => Date.now() - Date.parse(q.time) < DAY_MS && q.kansai.some((k) => k.scale >= STRONG_SHAKING),
  );
  for (const q of strong) {
    const worst = q.kansai.reduce((a, b) => (b.scale > a.scale ? b : a));
    alerts.push({
      id: `quake-${q.id}`,
      kind: "earthquake",
      area: worst.area,
      auto: true,
      shindo: worst.shindo,
      created_at: q.time,
      tsunami: q.tsunami,
    });
  }

  const placeNames = lang === "ja" ? quakes.map((q) => q.place) : await Promise.all(quakes.map((q) => translate(q.place, lang).then((t) => t.text)));

  res.json({
    emergency: alerts.length > 0,
    alerts,
    quakes: quakes.slice(0, 8).map((q, i) => ({ ...q, place: placeNames[i] })),
    checkins,
    my_checkin: mine ?? null,
  });
});

safety.post("/checkin", requireUser, async (req, res) => {
  const status = req.body?.status;
  if (!["safe", "need_help"].includes(status)) throw new HttpError(400, "status must be safe or need_help");
  const row = await one(
    `INSERT INTO safety_checkins (user_id, status, area) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, area = EXCLUDED.area, updated_at = now()
     RETURNING status, updated_at`,
    [req.user.id, status, req.user.area || ""],
  );
  res.json(row);
});

// --- Organizer alerts (protected by ADMIN_TOKEN) ----------------------------

function requireAdmin(req, _res, next) {
  const expected = process.env.ADMIN_TOKEN;
  const given = req.get("x-admin-token") ?? "";
  if (!expected) throw new HttpError(503, "Set ADMIN_TOKEN on the server to manage alerts");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(403, "Wrong admin token");
  next();
}

safety.post("/alerts", requireAdmin, async (req, res) => {
  requireFields(req.body, ["kind", "title"]);
  if (!ALERT_KINDS.includes(req.body.kind)) throw new HttpError(400, `kind must be one of: ${ALERT_KINDS.join(", ")}`);
  const a = await one(
    "INSERT INTO alerts (kind, area, title, message) VALUES ($1, $2, $3, $4) RETURNING *",
    [req.body.kind, req.body.area || null, String(req.body.title).slice(0, 200), String(req.body.message ?? "").slice(0, 2000)],
  );
  warm([a.title, a.message], ["en", "ja"]);
  res.status(201).json(a);
});

safety.delete("/alerts/:id", requireAdmin, async (req, res) => {
  await query("UPDATE alerts SET active = false WHERE id = $1", [Number(req.params.id) || 0]);
  res.json({ ok: true });
});

// --- Mutual aid board ---------------------------------------------------------

export const aid = Router();

// GET /aid?kind=need|offer&area=Kobe&category=interpreting
aid.get("/", async (req, res) => {
  const params = [];
  const where = ["p.status = 'open'", "p.created_at > now() - interval '14 days'"];
  for (const [key, col] of [["kind", "p.kind"], ["area", "p.area"], ["category", "p.category"]]) {
    if (req.query[key]) {
      params.push(req.query[key]);
      where.push(`${col} = $${params.length}`);
    }
  }
  const rows = await query(
    `SELECT p.*, to_jsonb(u) AS author FROM aid_posts p JOIN users u ON u.id = p.user_id
     WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC LIMIT 50`,
    params,
  );
  const lang = viewerLang(req);
  res.json(
    await Promise.all(
      rows.map(async (p) => {
        const t = await translateFields({ title: p.title, body: p.body }, lang);
        return {
          ...p,
          title: t.title.text,
          body: t.body.text,
          original: { title: p.title, body: p.body },
          translated: t.title.translated || t.body.translated,
          author: publicProfile(p.author),
          mine: req.user?.id === p.user_id,
        };
      }),
    ),
  );
});

aid.post("/", requireUser, async (req, res) => {
  const b = req.body;
  requireFields(b, ["kind", "title"]);
  if (!["need", "offer"].includes(b.kind)) throw new HttpError(400, "kind must be need or offer");
  const category = b.category ?? "other";
  if (!AID_CATEGORIES.includes(category)) throw new HttpError(400, `category must be one of: ${AID_CATEGORIES.join(", ")}`);
  const area = String(b.area || req.user.area || "").slice(0, 40);
  if (!area) throw new HttpError(400, "Missing fields: area");
  const p = await one(
    `INSERT INTO aid_posts (user_id, kind, category, title, body, area)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, b.kind, category, String(b.title).slice(0, 140), String(b.body ?? "").slice(0, 1500), area],
  );
  warm([p.title, p.body], ["en", "ja"]);
  res.status(201).json(p);
});

// Reply to a post: opens (or reopens) a 1:1 chat with its author.
aid.post("/:id/respond", requireUser, async (req, res) => {
  const p = await one("SELECT * FROM aid_posts WHERE id = $1", [Number(req.params.id) || 0]);
  if (!p) throw new HttpError(404, "Post not found");
  if (p.user_id === req.user.id) throw new HttpError(409, "This is your own post");

  const existing = await one(
    `SELECT c.id FROM conversations c
     JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = $2 AND a.left_at IS NULL
     JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = $3 AND b.left_at IS NULL
     WHERE c.aid_post_id = $1`,
    [p.id, req.user.id, p.user_id],
  );
  if (existing) return res.json({ conversation_id: existing.id });

  const conv = await one("INSERT INTO conversations (kind, aid_post_id) VALUES ('aid', $1) RETURNING id", [p.id]);
  await query(
    "INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)",
    [conv.id, req.user.id, p.user_id],
  );
  res.status(201).json({ conversation_id: conv.id });
});

aid.post("/:id/resolve", requireUser, async (req, res) => {
  const p = await one(
    "UPDATE aid_posts SET status = 'resolved' WHERE id = $1 AND user_id = $2 RETURNING *",
    [Number(req.params.id) || 0, req.user.id],
  );
  if (!p) throw new HttpError(404, "Post not found");
  res.json(p);
});
