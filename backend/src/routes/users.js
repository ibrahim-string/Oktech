import { Router } from "express";
import { db, parseRow } from "../db.js";
import { requireUser } from "../auth.js";
import { HttpError, requireFields, asStringArray } from "../http.js";
import { isSupportedLang } from "../translate.js";

export const users = Router();

const selectUser = db.prepare("SELECT * FROM users WHERE id = ?");

users.get("/", (_req, res) => {
  res.json(db.prepare("SELECT * FROM users ORDER BY id").all().map(parseRow));
});

users.get("/me", requireUser, (req, res) => res.json(req.user));

users.get("/:id", (req, res) => {
  const user = parseRow(selectUser.get(Number(req.params.id)));
  if (!user) throw new HttpError(404, "User not found");
  res.json(user);
});

users.post("/", (req, res) => {
  const b = req.body;
  requireFields(b, ["name"]);
  const preferred = b.preferred_lang ?? "en";
  if (!isSupportedLang(preferred)) throw new HttpError(400, `Unsupported language: ${preferred}`);

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO users (name, bio, area, is_local, preferred_lang, speaks, learning, interests)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      b.name,
      b.bio ?? "",
      b.area ?? "",
      b.is_local ? 1 : 0,
      preferred,
      JSON.stringify(asStringArray(b.speaks, "speaks") ?? []),
      JSON.stringify(asStringArray(b.learning, "learning") ?? []),
      JSON.stringify(asStringArray(b.interests, "interests") ?? []),
    );
  res.status(201).json(parseRow(selectUser.get(lastInsertRowid)));
});

users.patch("/me", requireUser, (req, res) => {
  const b = req.body ?? {};
  if (b.preferred_lang && !isSupportedLang(b.preferred_lang)) {
    throw new HttpError(400, `Unsupported language: ${b.preferred_lang}`);
  }
  const u = req.user;
  db.prepare(
    `UPDATE users SET name = ?, bio = ?, area = ?, is_local = ?, preferred_lang = ?,
       speaks = ?, learning = ?, interests = ? WHERE id = ?`,
  ).run(
    b.name ?? u.name,
    b.bio ?? u.bio,
    b.area ?? u.area,
    (b.is_local ?? u.is_local) ? 1 : 0,
    b.preferred_lang ?? u.preferred_lang,
    JSON.stringify(asStringArray(b.speaks, "speaks") ?? u.speaks),
    JSON.stringify(asStringArray(b.learning, "learning") ?? u.learning),
    JSON.stringify(asStringArray(b.interests, "interests") ?? u.interests),
    u.id,
  );
  res.json(parseRow(selectUser.get(u.id)));
});
