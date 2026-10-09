# KNOT

**Making local connections across cultures.** KNOT helps foreign residents and local Japanese people in Kansai meet, hang out, exchange languages, and build real friendships. Built for the Kansai Bridge hackathon.

```
backend/   Express 5 + node:sqlite REST API, Claude-powered JA⇄EN translation  → Railway
frontend/  React + Vite mobile-first web app, bilingual UI                     → Vercel
```

## Run locally

```bash
cd backend && npm install && cp .env.example .env && npm run dev   # :3001, seeds demo data on first boot
cd frontend && npm install && npm run dev                          # :5173, proxies /api to :3001
```

Use the switcher in the top-right to act as a different demo user. Each user sees the UI and content in their own language.

## 60-second demo

1. As **Emma** (Kobe, practicing Japanese), open the coffee language exchange (or post a new one with **＋ Post** and tap *Preview in Japanese*).
2. Switch to **Yuki** (Kobe local). The feed is in Japanese, and the post shows *あなたの日本語が役立ちます / 英語を練習できます*.
3. Yuki taps **参加**, then writes in the group chat in Japanese.
4. Switch back to Emma. Yuki's message appears in English, and *Show original* reveals the Japanese.
5. The meetup page shows both participants and their shared interests (coffee, photography).

## Deploy

### Backend → Railway
1. New project → Deploy from GitHub repo. The repo root deploys the backend as-is: the root `package.json` is an npm workspace that runs `backend/`, and `railway.json` sets the start command and health check. Setting **Root Directory** to `backend` also works.
2. Add a **Volume** mounted at `/data`, so the SQLite DB survives redeploys.
3. Variables:
   - `DB_PATH=/data/knot.db`
   - `ANTHROPIC_API_KEY=...` (for live translation; without it, text shows untranslated)
   - `CORS_ORIGIN=https://<your-app>.vercel.app,https://<your-app>-*.vercel.app` (optional; unset allows any origin. Include the wildcard so Vercel preview URLs work)
4. Settings → Networking → Generate Domain. **Leave the port empty or use the one Railway shows in the deploy logs** (`KNOT API listening on …:<port>`). A mismatched port gives a 502, which the browser reports as a failed fetch.
5. Check `https://<your-backend>.up.railway.app/health` returns `{"ok":true}`. Demo data seeds on first boot.

### Frontend → Vercel
1. Import the repo → set **Root Directory** to `frontend` (framework: Vite, auto-detected).
2. Environment variable: `VITE_API_URL=https://<your-backend>.up.railway.app`
3. **Redeploy after setting or changing it.** Vite bakes the value in at build time. Routing is hash-based, so no rewrites are needed.

If the app can't reach the API, the start screen says why (missing `VITE_API_URL`, unreachable host or CORS, or a URL that isn't the KNOT API) and shows the exact URL it tried.

See `backend/README.md` for the full API reference.
