import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { one, query } from "./db.js";

const MODEL = process.env.TRANSLATION_MODEL ?? "claude-opus-5-5";
const DISABLED = process.env.TRANSLATION_DISABLED === "1";

const LANGUAGE_NAMES = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese (Simplified)",
  ko: "Korean",
  vi: "Vietnamese",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  id: "Indonesian",
  th: "Thai",
  tl: "Filipino",
};

const SYSTEM = `You translate short, casual texts for KNOT, an app where foreign residents and local Japanese people in Kansai meet for hangouts and language exchange.

Translate the text inside <text> into the language given in <target_language>.
- Keep the friendly, casual tone. For Japanese, use natural polite-casual (です/ます is fine, avoid stiff keigo).
- Keep place names, station names, times, emoji and @mentions as they are.
- If the text is already in the target language, return it unchanged.
- Output only the translated text, with no quotes, notes or explanations.`;

let client;
function getClient() {
  // The SDK resolves credentials from ANTHROPIC_API_KEY (or an `ant auth login` profile).
  client ??= new Anthropic();
  return client;
}

const selectCached = (hash, lang) =>
  one("SELECT translated FROM translations WHERE source_hash = $1 AND target_lang = $2", [hash, lang]);

export const cacheTranslation = (hash, lang, text) =>
  query(
    `INSERT INTO translations (source_hash, target_lang, translated) VALUES ($1, $2, $3)
     ON CONFLICT (source_hash, target_lang) DO UPDATE SET translated = EXCLUDED.translated`,
    [hash, lang, text],
  );

export const hash = (text) => createHash("sha256").update(text).digest("hex");
const inflight = new Map();

export const isSupportedLang = (lang) => lang in LANGUAGE_NAMES;
export const supportedLanguages = () => ({ ...LANGUAGE_NAMES });

/**
 * Translate `text` into `targetLang`. Results are cached in SQLite.
 * Never throws: on failure the original text comes back with translated=false,
 * so the app keeps working without an API key.
 */
export async function translate(text, targetLang) {
  if (!text?.trim() || !isSupportedLang(targetLang)) {
    return { text, translated: false };
  }

  const key = hash(text);
  const cached = await selectCached(key, targetLang);
  if (cached) return { text: cached.translated, translated: true };
  if (DISABLED) return { text, translated: false };

  const inflightKey = `${key}:${targetLang}`;
  if (!inflight.has(inflightKey)) {
    inflight.set(
      inflightKey,
      callClaude(text, targetLang).finally(() => inflight.delete(inflightKey)),
    );
  }
  const result = await inflight.get(inflightKey);
  if (result.translated) await cacheTranslation(key, targetLang, result.text);
  return result;
}

async function callClaude(text, targetLang) {
  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      // If a safety classifier declines, re-run on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `<target_language>${LANGUAGE_NAMES[targetLang]}</target_language>\n<text>\n${text}\n</text>`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      console.warn("[translate] refused:", response.stop_details?.category);
      return { text, translated: false };
    }

    const out = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    return out ? { text: out, translated: true } : { text, translated: false };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.warn("[translate] no valid Anthropic credentials; returning original text");
    } else if (err instanceof Anthropic.RateLimitError) {
      console.warn("[translate] rate limited; returning original text");
    } else if (err instanceof Anthropic.APIError) {
      console.warn(`[translate] API error ${err.status}: ${err.message}`);
    } else {
      console.warn("[translate] failed:", err.message);
    }
    return { text, translated: false };
  }
}

/** Translate several fields of an object at once: { title: "...", description: "..." }. */
export async function translateFields(fields, targetLang) {
  const entries = await Promise.all(
    Object.entries(fields).map(async ([k, v]) => [k, await translate(v, targetLang)]),
  );
  return Object.fromEntries(entries);
}

/** Pre-translate in the background so later reads are cache hits. Never rejects. */
export function warm(texts, langs) {
  for (const text of texts) {
    for (const lang of langs) {
      translate(text, lang).catch((err) => console.warn("[translate] warm failed:", err.message));
    }
  }
}
