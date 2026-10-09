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
1. New project → Deploy from GitHub repo → set **Root Directory** to `backend`.
2. Add a **Volume** mounted at `/data`, so the SQLite DB survives redeploys.
3. Variables:
   - `DB_PATH=/data/knot.db`
   - `ANTHROPIC_API_KEY=...` (for live translation; without it, text shows untranslated)
   - `CORS_ORIGIN=https://<your-app>.vercel.app` (optional; unset allows any origin)
4. Generate a public domain under Settings → Networking. Railway sets `PORT` automatically. Demo data seeds on first boot.

### Frontend → Vercel
1. Import the repo → set **Root Directory** to `frontend` (framework: Vite, auto-detected).
2. Environment variable: `VITE_API_URL=https://<your-backend>.up.railway.app`
3. Deploy. Routing is hash-based, so no rewrites are needed.

See `backend/README.md` for the full API reference.
