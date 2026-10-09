# KNOT

**Making local connections across cultures.** KNOT helps foreign residents and local Japanese people in Kansai meet at random, hang out, exchange languages, and help each other when an earthquake or flood hits. No sign-up: everyone joins anonymously. Built for the Kansai Bridge hackathon.

```
backend/   Express 5 + Postgres (Supabase) API, Claude JA⇄EN translation, JMA quake feed → Railway
frontend/  React + Vite mobile-first web app, bilingual UI                              → Vercel
```

## What's in it

- **Anonymous entry.** Pick a language and a few chips, get a random nickname ("Sunny Tanuki 27"), start. The session lives on the device.
- **Meet (random 1:1).** One tap pairs you with someone nearby, preferring a language swap (a local learning English with a resident learning Japanese). Chats are translated both ways and open with a bilingual icebreaker. End or report anytime; reporting blocks future matches.
- **Hangouts.** Small public meetups (coffee, games, walks) with a feed in your language, *Surprise me*, and a translated group chat.
- **Help (social cause).**
  - Emergency mode switches on automatically after strong shaking (intensity 5- or more) in Kansai, or when an organizer raises a flood/typhoon/tsunami alert at `#/admin`.
  - "Are you OK?" check-ins with per-area counts.
  - Mutual aid board: "need help" / "can help" posts (interpreting, supplies, shelter, transport…), auto-translated; *Message* opens a 1:1 chat.
  - Emergency numbers, what to do in an earthquake, flood or typhoon, and key Japanese phrases. Recent quakes come from the Japan Meteorological Agency (via P2PQuake).

## Run locally

```bash
cd backend && npm install && cp .env.example .env   # set DATABASE_URL (Supabase); ADMIN_TOKEN for alerts
npm run dev                                          # :3001, creates tables + seeds demo data on first boot
cd frontend && npm install && npm run dev            # :5173, proxies /api to :3001
```

Use two browsers (or one normal and one private window) to be two different anonymous people.

## 90-second demo

1. **Window A** (English, "moved here from abroad", Kobe) and **Window B** (日本語, 日本出身, Kobe) both finish onboarding.
2. Both tap **Meet**: they're paired, see each other's languages and the same icebreaker in their own language. B writes in Japanese, and A reads it in English (*Show original* reveals the Japanese).
3. **Hangouts:** A opens Emma's coffee exchange and joins; *Surprise me* jumps to a random meetup.
4. **Social cause:** open `#/admin`, enter the admin token, raise a **Flood** alert for Osaka. Both windows turn red within a minute (or on opening Help). B taps **助けが必要です** and posts "避難の案内が読めない" to the aid board. A sees it in English and taps **Message** to help.
5. End the alert from `#/admin`.

## Deploy

### Backend → Railway
1. New project → Deploy from GitHub repo. The repo root deploys the backend as-is: the root `package.json` is an npm workspace that runs `backend/`, and `railway.json` sets the start command and health check. Setting **Root Directory** to `backend` also works.
2. No volume needed: data lives in Supabase.
3. Variables:
   - `DATABASE_URL=` Supabase **Session pooler** connection string (Project Settings → Database → Connect). The direct `db.<ref>.supabase.co` host is IPv6-only and may not be reachable from Railway.
   - `ANTHROPIC_API_KEY=...` (for live translation; without it, text shows untranslated)
   - `ADMIN_TOKEN=` any long random string; lets organizers raise emergency alerts at `#/admin`
   - `CORS_ORIGIN=https://<your-app>.vercel.app,https://<your-app>-*.vercel.app` (optional; unset allows any origin. Include the wildcard so Vercel preview URLs work)
4. Settings → Networking → Generate Domain. **Leave the port empty or use the one Railway shows in the deploy logs** (`KNOT API listening on …:<port>`). A mismatched port gives a 502, which the browser reports as a failed fetch.
5. Check `https://<your-backend>.up.railway.app/health` returns `{"ok":true}`. Demo data seeds on first boot.

### Frontend → Vercel
1. Import the repo → set **Root Directory** to `frontend` (framework: Vite, auto-detected).
2. Environment variable: `VITE_API_URL=https://<your-backend>.up.railway.app`
3. **Redeploy after setting or changing it.** Vite bakes the value in at build time. Routing is hash-based, so no rewrites are needed.

If the app can't reach the API, the start screen says why (missing `VITE_API_URL`, unreachable host or CORS, or a URL that isn't the KNOT API) and shows the exact URL it tried.

See `backend/README.md` for the full API reference.
