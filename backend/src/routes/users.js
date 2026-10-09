import { Router } from "express";
import { one, query } from "../db.js";
import { requireUser } from "../auth.js";
import { HttpError, requireFields, asStringArray } from "../http.js";
import { isSupportedLang } from "../translate.js";

export const users = Router();

const json = (v) => JSON.stringify(v);

users.get("/", async (_req, res) => {
  res.json(await query("SELECT * FROM users ORDER BY id"));
});

users.get("/me", requireUser, (req, res) => res.json(req.user));

users.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const user = Number.isInteger(id) ? await one("SELECT * FROM users WHERE id = $1", [id]) : null;
  if (!user) throw new HttpError(404, "User not found");
  res.json(user);
});

users.post("/", async (req, res) => {
  const b = req.body;
  requireFields(b, ["name"]);
  const preferred = b.preferred_lang ?? "en";
  if (!isSupportedLang(preferred)) throw new HttpError(400, `Unsupported language: ${preferred}`);

  const user = await one(
    `INSERT INTO users (name, bio, area, is_local, preferred_lang, speaks, learning, interests)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      b.name,
      b.bio ?? "",
      b.area ?? "",
      Boolean(b.is_local),
      preferred,
      json(asStringArray(b.speaks, "speaks") ?? []),
      json(asStringArray(b.learning, "learning") ?? []),
      json(asStringArray(b.interests, "interests") ?? []),
    ],
  );
  res.status(201).json(user);
});

users.patch("/me", requireUser, async (req, res) => {
  const b = req.body ?? {};
  if (b.preferred_lang && !isSupportedLang(b.preferred_lang)) {
    throw new HttpError(400, `Unsupported language: ${b.preferred_lang}`);
  }
  const u = req.user;
  const user = await one(
    `UPDATE users SET name = $1, bio = $2, area = $3, is_local = $4, preferred_lang = $5,
       speaks = $6, learning = $7, interests = $8 WHERE id = $9 RETURNING *`,
    [
      b.name ?? u.name,
      b.bio ?? u.bio,
      b.area ?? u.area,
      Boolean(b.is_local ?? u.is_local),
      b.preferred_lang ?? u.preferred_lang,
      json(asStringArray(b.speaks, "speaks") ?? u.speaks),
      json(asStringArray(b.learning, "learning") ?? u.learning),
      json(asStringArray(b.interests, "interests") ?? u.interests),
      u.id,
    ],
  );
  res.json(user);
});
