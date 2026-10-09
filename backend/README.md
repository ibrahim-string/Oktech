# KNOT backend

REST API for KNOT: bilingual hangouts for foreign residents and local Japanese people in Kansai.

**Stack:** Node 22.10+ (tested on 24), Express 5, Postgres via `pg` (Supabase), Claude API for translation.

## Run

```bash
cp .env.example .env      # set DATABASE_URL; add ANTHROPIC_API_KEY for live translation
npm install
npm run dev               # http://localhost:3001 — creates tables, seeds demo data if empty
npm run seed              # reset KNOT's tables to the demo scenario
```

Without an API key everything still works. Seeded posts have hand-written JA/EN translations, and new text is returned untranslated (`translated: false`).

## Auth (hackathon only)

Send `X-User-Id: <id>` to act as a user. Seeded users: `1` Emma (Kobe, EN→learning JA), `2` Yuki (Kobe local, JA→learning EN), `3` Kenta (Osaka local), `4` Lucas (Kyoto, PT/EN→learning JA).

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | |
| GET | `/meta` | Supported languages and categories |
| GET | `/users` · `/users/:id` · `/users/me` | Profiles: `speaks`, `learning`, `interests`, `preferred_lang` |
| POST | `/users` | `{ name, bio?, area?, is_local?, preferred_lang?, speaks?, learning?, interests? }` |
| PATCH | `/users/me` | Any of the fields above |
| GET | `/hangouts` | Feed. Query: `area`, `category`, `lang`, `include_past`. Title and description come back in the viewer's language |
| GET | `/hangouts/:id` | Adds `participants` and `shared_interests` |
| POST | `/hangouts` | `{ title, area, place_name, starts_at, description?, category?, languages?, max_participants? }`. The host auto-joins |
| POST / DELETE | `/hangouts/:id/join` | Join / leave |
| POST | `/hangouts/:id/cancel` | Host only |
| GET | `/hangouts/:id/messages` | Participants only. Other people's messages are translated to your language (`text`), and the original is kept in `body`. Use `?after=<id>` to poll |
| POST | `/hangouts/:id/messages` | `{ body }` |
| POST | `/translate` | `{ text, target }`, for previewing a post in the other language |

Every hangout in a response includes `language_match` for the viewer:
`{ you_can_help_with: ["ja"], you_can_practice: ["en"] }`. This powers the "the organizer wants to practice Japanese" moment in the demo.

Display language is resolved in this order: `?lang=`, then the user's `preferred_lang`, then `en`.

## Translation

`src/translate.js` calls Claude (`claude-opus-5-5` at low effort, override with `TRANSLATION_MODEL`) and caches results in Postgres by text hash and target language. New posts and messages are pre-translated in the background, so reads are usually cache hits. Any failure falls back to the original text and never returns an error.

## Before a real launch

Real auth (e.g. Supabase Auth), reporting and blocking, profile visibility controls, meetup-safety guidance, rate limiting, and a least-privilege database role instead of `postgres`.

## Database notes

Tables are created on boot (`src/db.js`, `CREATE TABLE IF NOT EXISTS`). Row Level Security is enabled with no policies, so Supabase's public Data API (anon key) can't read or write them; only this server, connecting as `postgres`, can. `npm run seed` truncates KNOT's five tables only.
