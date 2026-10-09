import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH ?? "./data/knot.db";
mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  bio             TEXT NOT NULL DEFAULT '',
  area            TEXT NOT NULL DEFAULT '',          -- e.g. Kobe, Osaka, Kyoto
  is_local        INTEGER NOT NULL DEFAULT 0,        -- 1 = local Japanese resident
  preferred_lang  TEXT NOT NULL DEFAULT 'en',        -- language the UI/feed is shown in
  speaks          TEXT NOT NULL DEFAULT '[]',        -- JSON: languages they can share/teach
  learning        TEXT NOT NULL DEFAULT '[]',        -- JSON: languages they want to practice
  interests       TEXT NOT NULL DEFAULT '[]',        -- JSON: free-form tags
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hangouts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  host_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT 'language_exchange',
  languages         TEXT NOT NULL DEFAULT '["ja","en"]', -- JSON: languages used at the meetup
  area              TEXT NOT NULL,
  place_name        TEXT NOT NULL,                       -- public place: cafe, community space...
  starts_at         TEXT NOT NULL,                       -- ISO 8601
  max_participants  INTEGER NOT NULL DEFAULT 4,
  status            TEXT NOT NULL DEFAULT 'open',        -- open | cancelled | done
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hangout_participants (
  hangout_id  INTEGER NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hangout_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  hangout_id  INTEGER NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS translations (
  source_hash  TEXT NOT NULL,
  target_lang  TEXT NOT NULL,
  translated   TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (source_hash, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_hangouts_starts ON hangouts(starts_at);
CREATE INDEX IF NOT EXISTS idx_messages_hangout ON messages(hangout_id, id);
`);

const JSON_COLUMNS = ["speaks", "learning", "interests", "languages"];

/** Parse JSON text columns on a row returned by node:sqlite. */
export function parseRow(row) {
  if (!row) return row;
  const out = { ...row };
  for (const col of JSON_COLUMNS) {
    if (typeof out[col] === "string") out[col] = JSON.parse(out[col]);
  }
  if ("is_local" in out) out.is_local = Boolean(out.is_local);
  return out;
}
