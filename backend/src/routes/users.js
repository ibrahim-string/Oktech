import { Router } from "express";
import { one } from "../db.js";
import { requireUser, newToken, hashToken, ownProfile } from "../auth.js";
import { HttpError, asStringArray } from "../http.js";
import { isSupportedLang } from "../translate.js";
import { randomName } from "../names.js";

export const users = Router();

const json = (v) => JSON.stringify(v);

function profileFields(b, current = {}) {
  const preferred = b.preferred_lang ?? current.preferred_lang ?? "en";
  if (!isSupportedLang(preferred)) throw new HttpError(400, `Unsupported language: ${preferred}`);
  const name = String(b.name ?? current.name ?? "").trim().slice(0, 40);
  if (!name) throw new HttpError(400, "Name can't be empty");
  const langs = (field) => {
    const list = asStringArray(b[field], field) ?? current[field] ?? [];
    const bad = list.filter((l) => !isSupportedLang(l));
    if (bad.length) throw new HttpError(400, `Unsupported languages: ${bad.join(", ")}`);
    return list;
  };
  return [
    name,
    String(b.bio ?? current.bio ?? "").slice(0, 300),
    String(b.area ?? current.area ?? "").slice(0, 40),
    Boolean(b.is_local ?? current.is_local),
    preferred,
    json(langs("speaks")),
    json(langs("learning")),
    json((asStringArray(b.interests, "interests") ?? current.interests ?? []).slice(0, 15).map((i) => i.slice(0, 30))),
  ];
}

// Start an anonymous session. No sign-up: a nickname is generated if none is given.
users.post("/session", async (req, res) => {
  const b = req.body ?? {};
  const token = newToken();
  const user = await one(
    `INSERT INTO users (name, bio, area, is_local, preferred_lang, speaks, learning, interests, token_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [...profileFields({ ...b, name: b.name?.trim() || randomName() }), hashToken(token)],
  );
  res.status(201).json({ token, user: ownProfile(user) });
});

users.get("/me", requireUser, (req, res) => res.json(ownProfile(req.user)));

users.patch("/me", requireUser, async (req, res) => {
  const user = await one(
    `UPDATE users SET name = $1, bio = $2, area = $3, is_local = $4, preferred_lang = $5,
       speaks = $6, learning = $7, interests = $8 WHERE id = $9 RETURNING *`,
    [...profileFields(req.body ?? {}, req.user), req.user.id],
  );
  res.json(ownProfile(user));
});

users.get("/random-name", (_req, res) => res.json({ name: randomName() }));
