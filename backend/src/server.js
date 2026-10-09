import express from "express";
import cors from "cors";
import { migrate, one } from "./db.js";
import { seed } from "./seed.js";
import { loadUser, requireUser } from "./auth.js";
import { HttpError, requireFields } from "./http.js";
import { users } from "./routes/users.js";
import { hangouts, CATEGORIES } from "./routes/hangouts.js";
import { conversations, match } from "./routes/conversations.js";
import { safety, aid, AID_CATEGORIES, ALERT_KINDS } from "./routes/safety.js";
import { translate, isSupportedLang, supportedLanguages } from "./translate.js";

// Create tables on boot; a fresh database starts with the demo data.
await migrate();
if (process.env.AUTO_SEED !== "0" && (await one("SELECT count(*)::int AS n FROM users")).n === 0) {
  await seed();
}

const app = express();
app.use(cors({ origin: corsOrigin(process.env.CORS_ORIGIN) }));
app.use(express.json({ limit: "100kb" }));
app.use(loadUser);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/meta", (_req, res) =>
  res.json({ languages: supportedLanguages(), categories: CATEGORIES, aid_categories: AID_CATEGORIES, alert_kinds: ALERT_KINDS }),
);

app.use("/", users); // POST /session, GET/PATCH /me
app.use("/hangouts", hangouts);
app.use("/conversations", conversations);
app.use("/match", match);
app.use("/safety", safety);
app.use("/aid", aid);

// Ad-hoc translation, e.g. to preview a post in the other language before publishing.
app.post("/translate", requireUser, async (req, res) => {
  requireFields(req.body, ["text", "target"]);
  if (!isSupportedLang(req.body.target)) throw new HttpError(400, "Unsupported target language");
  res.json(await translate(String(req.body.text).slice(0, 4000), req.body.target));
});

app.use((_req, _res, next) => next(new HttpError(404, "Not found")));
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Internal server error" : err.message });
});

/**
 * CORS_ORIGIN: comma-separated origins, e.g. "https://knot.vercel.app,https://*.vercel.app".
 * "*" wildcards and trailing slashes are allowed. Unset or "*" = allow every origin.
 */
function corsOrigin(value) {
  const entries = (value ?? "").split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
  if (!entries.length || entries.includes("*")) return true;
  const patterns = entries.map(
    (o) => new RegExp("^" + o.split("*").map(escapeRegExp).join("[^/]*") + "$", "i"),
  );
  return (origin, cb) => cb(null, !origin || patterns.some((p) => p.test(origin)));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`KNOT API listening on http://localhost:${port}`));
