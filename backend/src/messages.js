import { translate } from "./translate.js";

/**
 * Add `text` (in the viewer's language) to chat messages. Your own messages and
 * system events (kind !== "text") are passed through untranslated.
 */
export function presentMessages(rows, viewerId, lang) {
  return Promise.all(
    rows.map(async (m) => {
      const skip = m.sender_id === viewerId || (m.kind && m.kind !== "text");
      const t = skip ? { text: m.body, translated: false } : await translate(m.body, lang);
      return { ...m, text: t.text, translated: t.translated, display_lang: lang };
    }),
  );
}
