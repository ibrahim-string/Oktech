import { db, parseRow } from "./db.js";
import { HttpError } from "./http.js";

const selectUser = db.prepare("SELECT * FROM users WHERE id = ?");

/**
 * Hackathon auth: the client sends `X-User-Id: <id>` to act as that user.
 * Replace with real auth (e.g. sessions or JWT) before any real launch.
 */
export function loadUser(req, _res, next) {
  const id = Number(req.get("x-user-id"));
  req.user = Number.isInteger(id) && id > 0 ? parseRow(selectUser.get(id)) : null;
  next();
}

export function requireUser(req, _res, next) {
  if (!req.user) throw new HttpError(401, "Send an X-User-Id header for an existing user");
  next();
}

/** Language to show content in: ?lang= wins, then the user's preference, then English. */
export function viewerLang(req) {
  return req.query.lang ?? req.user?.preferred_lang ?? "en";
}
