# KNOT backend

REST API for KNOT: random chats, small hangouts and disaster mutual aid for foreign residents and local Japanese people in Kansai.

**Stack:** Node 22.10+ (tested on 24), Express 5, Postgres via `pg` (Supabase), Claude API for translation, P2PQuake (JMA data) for earthquakes.

## Run

```bash
cp .env.example .env      # set DATABASE_URL; add ANTHROPIC_API_KEY for live translation
npm install
npm run dev               # http://localhost:3001: creates tables, seeds demo data if empty
npm run seed              # reset KNOT's tables to the demo scenario (wipes everything)
```

Without an API key everything still works. Seeded posts have hand-written JA/EN translations, and new text is returned untranslated (`translated: false`).

## Anonymous sessions

There is no sign-up. `POST /session` creates an anonymous user (random nickname if none is given) and returns a token. The client keeps it and sends `Authorization: Bearer <token>`. Only a SHA-256 hash of the token is stored.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health`, `/meta` | Status; supported languages, categories, aid categories, alert kinds |
| POST | `/session` | `{ preferred_lang, is_local, speaks, learning, area, name?, interests? }` → `{ token, user }` |
| GET / PATCH | `/me` | Your profile |
| GET | `/random-name` | A fresh nickname suggestion |
| **Hangouts** | | |
| GET | `/hangouts` | Feed in the viewer's language. Query: `area`, `category`, `lang`, `include_past` |
| GET | `/hangouts/:id` | With `participants` and `shared_interests` |
| POST | `/hangouts` | `{ title, area, place_name, starts_at, description?, category?, languages?, max_participants? }` |
| POST / DELETE | `/hangouts/:id/join` | Join / leave (joining locks the row so the last spot can't be double-booked) |
| POST | `/hangouts/:id/cancel` | Host only |
| GET / POST | `/hangouts/:id/messages` | Group chat (participants only), translated per viewer; poll with `?after=<id>` |
| **Random 1:1 chats** | | |
| POST | `/match` | Join the queue or poll it (every ~2s): `{ status: "waiting" \| "matched", conversation_id?, others_waiting }`. Prefers language-swap partners and local/foreign mixes; never pairs blocked people |
| DELETE | `/match` | Leave the queue |
| GET | `/conversations` | Your chats |
| GET | `/conversations/:id` | Partner profile, `language_match`, bilingual icebreaker `topic`, `aid_post` for aid chats |
| GET / POST | `/conversations/:id/messages` | Translated per viewer; system events have `kind: "left" \| "topic"` |
| POST | `/conversations/:id/topic` | New random icebreaker |
| POST | `/conversations/:id/leave` | End the chat |
| POST | `/conversations/:id/report` | `{ reason? }`: records a report, blocks them, leaves |
| **Disaster support** | | |
| GET | `/safety` | `{ emergency, alerts, quakes, checkins, my_checkin }`. Emergency is on when an organizer alert is active **or** shaking of intensity 5- or more hit Kansai in the last 24h |
| POST | `/safety/checkin` | `{ status: "safe" \| "need_help" }` |
| POST | `/safety/alerts` | Header `X-Admin-Token: $ADMIN_TOKEN`. `{ kind, title, message?, area? }` (kind: earthquake, flood, typhoon, tsunami, other) |
| DELETE | `/safety/alerts/:id` | End an alert (admin token) |
| GET | `/aid` | Mutual aid board, translated. Query: `kind` (need/offer), `area`, `category` |
| POST | `/aid` | `{ kind, category, title, body?, area? }` |
| POST | `/aid/:id/respond` | Opens (or reuses) a 1:1 chat with the author |
| POST | `/aid/:id/resolve` | Author only |
| POST | `/translate` | `{ text, target }` (session required, so anonymous visitors can't spend API credits) |

Display language is resolved in this order: `?lang=`, then the user's `preferred_lang`, then `en`.

## Translation

`src/translate.js` calls Claude (`claude-opus-5-5` at low effort, override with `TRANSLATION_MODEL`) and caches results in Postgres by text hash and target language. New posts and messages are pre-translated in the background, so reads are usually cache hits. Any failure falls back to the original text and never returns an error.

## Earthquakes

`src/quakes.js` reads the last 20 JMA earthquake reports from [P2PQuake](https://www.p2pquake.net/develop/json_api_v2/) (cached for 60s) and records the strongest intensity felt in each Kansai prefecture. If the feed is down, the last good data is served.

## Database notes

Tables are created on boot (`src/db.js`, `CREATE TABLE IF NOT EXISTS`) inside their own Postgres schema, `knot` by default (`DB_SCHEMA`), so KNOT can share a database with another app without touching its tables. Every connection sets `search_path` to that schema only. Row Level Security is enabled with no policies, so Supabase's public Data API (anon key) can't read or write them; only this server, connecting as `postgres`, can.

## Before a real launch

Moderation tooling for reports, rate limiting (especially `/match` and messages), verified organizer accounts for alerts, a least-privilege database role instead of `postgres`, and official evacuation shelter data per city.
