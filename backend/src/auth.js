import { createHash, randomBytes } from "node:crypto";
import { one } from "./db.js";
import { HttpError } from "./http.js";

/**
 * Anonymous sessions. POST /session creates a user and returns a random token; the
 * browser keeps it and sends `Authorization: Bearer <token>`. Only the hash is stored,
 * so a leaked database doesn't leak working tokens.
 */
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export async function loadUser(req, _res, next) {
  const token = req.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  req.user = token
    ? await one("UPDATE users SET last_seen = now() WHERE token_hash = $1 RETURNING *", [hashToken(token)])
    : null;
  next();
}

export function requireUser(req, _res, next) {
  if (!req.user) throw new HttpError(401, "Session expired. Reload to start a new one.");
  next();
}

/** Language to show content in: ?lang= wins, then the user's preference, then English. */
export function viewerLang(req) {
  return req.query.lang ?? req.user?.preferred_lang ?? "en";
}

/** The fields other people may see about someone. */
export const publicProfile = ({ id, name, bio, area, is_local, speaks, learning, interests }) => ({
  id, name, bio, area, is_local, speaks, learning, interests,
});

/** Your own profile (never includes the token hash). */
export const ownProfile = (u) => ({ ...publicProfile(u), preferred_lang: u.preferred_lang });

/** What the viewer and another person can do for each other, language-wise. */
export function languageMatch(viewer, other) {
  if (!viewer || viewer.id === other.id) return null;
  return {
    you_can_help_with: other.learning.filter((l) => viewer.speaks.includes(l)),
    you_can_practice: viewer.learning.filter((l) => other.speaks.includes(l)),
  };
}
