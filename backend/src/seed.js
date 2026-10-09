// Resets KNOT's tables and loads the demo scenario from the pitch:
// Emma (foreign resident in Kobe) hosts a coffee language exchange; Yuki (local) discovers and joins.
import { pathToFileURL } from "node:url";
import { migrate, pool, withTransaction } from "./db.js";
import { hash } from "./translate.js";

/** Wipe KNOT's tables (only these five) and load the demo data. */
export async function seed() {
  await withTransaction(async (c) => {
    await c.query(
      "TRUNCATE messages, hangout_participants, hangouts, users, translations RESTART IDENTITY CASCADE",
    );

    const user = async (name, bio, area, isLocal, pref, speaks, learning, interests) =>
      (
        await c.query(
          `INSERT INTO users (name, bio, area, is_local, preferred_lang, speaks, learning, interests)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [name, bio, area, isLocal, pref, JSON.stringify(speaks), JSON.stringify(learning), JSON.stringify(interests)],
        )
      ).rows[0].id;

    const join = (hangoutId, userId) =>
      c.query("INSERT INTO hangout_participants (hangout_id, user_id) VALUES ($1, $2)", [hangoutId, userId]);

    const cache = (source, lang, text) =>
      c.query(
        `INSERT INTO translations (source_hash, target_lang, translated) VALUES ($1, $2, $3)
         ON CONFLICT (source_hash, target_lang) DO UPDATE SET translated = EXCLUDED.translated`,
        [hash(source), lang, text],
      );

    const hangout = async ({ host, title, description, category, area, place, startsAt, max, translations }) => {
      const { rows } = await c.query(
        `INSERT INTO hangouts (host_id, title, description, category, languages, area, place_name, starts_at, max_participants)
         VALUES ($1, $2, $3, $4, '["ja","en"]', $5, $6, $7, $8) RETURNING id`,
        [host, title, description, category, area, place, startsAt, max],
      );
      await join(rows[0].id, host);
      // Hand-written translations so the demo works even without an API key.
      for (const [lang, t] of Object.entries(translations)) {
        await cache(title, lang, t.title);
        await cache(description, lang, t.description);
      }
      return rows[0].id;
    };

    const emma = await user("Emma", "From Melbourne, teaching English in Kobe for a year. Love cafés and hiking Mt. Rokko.",
      "Kobe", false, "en", ["en"], ["ja"], ["coffee", "hiking", "photography", "anime"]);
    const yuki = await user("Yuki", "神戸生まれ神戸育ち。来年ワーホリでオーストラリアに行きたいです！",
      "Kobe", true, "ja", ["ja"], ["en"], ["coffee", "photography", "travel", "baking"]);
    const kenta = await user("Kenta", "大阪の会社員。ボードゲームとたこ焼きが好き。",
      "Osaka", true, "ja", ["ja"], ["en"], ["board games", "food", "baseball"]);
    const lucas = await user("Lucas", "Brazilian grad student at Kyoto University. Always hungry.",
      "Kyoto", false, "en", ["pt", "en"], ["ja"], ["food", "temples", "football", "board games"]);

    await hangout({
      host: emma,
      title: "Coffee and Japanese-English language exchange this Saturday",
      description:
        "Casual chat at a café near Sannomiya. Half the time in Japanese, half in English. All levels welcome. I'm practicing Japanese, so please be patient with me!",
      category: "language_exchange",
      area: "Kobe",
      place: "Café near Sannomiya Station",
      startsAt: nextWeekdayJst(6, 14),
      max: 4,
      translations: {
        ja: {
          title: "今週土曜日、コーヒーを飲みながら日英ランゲージエクスチェンジ",
          description:
            "三宮駅近くのカフェで気軽におしゃべりしましょう。半分は日本語、半分は英語で。レベルは問いません。日本語を練習中なので、ゆっくり話してもらえると嬉しいです！",
        },
      },
    });

    const games = await hangout({
      host: kenta,
      title: "梅田でボードゲーム会",
      description: "初心者歓迎！簡単なゲームから始めます。英語でも日本語でもOK。終わったらたこ焼き食べに行きましょう。",
      category: "board_games",
      area: "Osaka",
      place: "Board game café in Umeda",
      startsAt: nextWeekdayJst(0, 13),
      max: 6,
      translations: {
        en: {
          title: "Board game meetup in Umeda",
          description:
            "Beginners welcome! We'll start with easy games. English or Japanese is fine. Let's go get takoyaki afterwards.",
        },
      },
    });
    await join(games, lucas);

    await hangout({
      host: lucas,
      title: "Morning walk at Fushimi Inari + breakfast",
      description:
        "Beat the crowds with an early walk up the torii gates, then breakfast nearby. Happy to speak English or Portuguese, want to practice Japanese.",
      category: "sightseeing",
      area: "Kyoto",
      place: "Fushimi Inari Station exit",
      startsAt: nextWeekdayJst(6, 7),
      max: 5,
      translations: {
        ja: {
          title: "伏見稲荷の朝さんぽ＋朝ごはん",
          description:
            "混む前に朝早く鳥居をくぐって歩き、そのあと近くで朝ごはんを食べましょう。英語やポルトガル語で話せます。日本語を練習したいです。",
        },
      },
    });

    console.log(`Seeded users: Emma=${emma}, Yuki=${yuki}, Kenta=${kenta}, Lucas=${lucas}`);
  });
}

/**
 * Next given weekday (0 = Sunday) at `hour` Japan time, as ISO. Computed in JST
 * so it's right whatever timezone the server runs in (Railway uses UTC).
 */
function nextWeekdayJst(day, hour) {
  const JST = 9 * 3600 * 1000;
  const nowJst = new Date(Date.now() + JST);
  const d = new Date(Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate(), hour));
  d.setUTCDate(d.getUTCDate() + ((day - nowJst.getUTCDay() + 7) % 7 || 7));
  return new Date(d.getTime() - JST).toISOString();
}

// `npm run seed`: create tables if needed, reset the demo data, exit.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await migrate();
  await seed();
  await pool.end();
}
