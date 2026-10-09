// Resets the database and loads the demo scenario from the pitch:
// Emma (foreign resident in Kobe) hosts a coffee language exchange; Yuki (local) discovers and joins.
import { createHash } from "node:crypto";
import { db } from "./db.js";

db.exec(`
  DELETE FROM messages; DELETE FROM hangout_participants; DELETE FROM hangouts;
  DELETE FROM users; DELETE FROM translations;
  DELETE FROM sqlite_sequence WHERE name IN ('users','hangouts','messages');
`);

const addUser = db.prepare(
  `INSERT INTO users (name, bio, area, is_local, preferred_lang, speaks, learning, interests)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
const user = (name, bio, area, isLocal, pref, speaks, learning, interests) =>
  Number(
    addUser.run(name, bio, area, isLocal ? 1 : 0, pref, JSON.stringify(speaks),
      JSON.stringify(learning), JSON.stringify(interests)).lastInsertRowid,
  );

const emma = user("Emma", "From Melbourne, teaching English in Kobe for a year. Love cafés and hiking Mt. Rokko.",
  "Kobe", false, "en", ["en"], ["ja"], ["coffee", "hiking", "photography", "anime"]);
const yuki = user("Yuki", "神戸生まれ神戸育ち。来年ワーホリでオーストラリアに行きたいです！",
  "Kobe", true, "ja", ["ja"], ["en"], ["coffee", "photography", "travel", "baking"]);
const kenta = user("Kenta", "大阪の会社員。ボードゲームとたこ焼きが好き。",
  "Osaka", true, "ja", ["ja"], ["en"], ["board games", "food", "baseball"]);
const lucas = user("Lucas", "Brazilian grad student at Kyoto University. Always hungry.",
  "Kyoto", false, "en", ["pt", "en"], ["ja"], ["food", "temples", "football", "board games"]);

// Dates relative to today so the feed is always "upcoming".
function nextWeekday(day, hour) {
  const d = new Date();
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7 || 7));
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const addHangout = db.prepare(
  `INSERT INTO hangouts (host_id, title, description, category, languages, area, place_name, starts_at, max_participants)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const join = db.prepare("INSERT INTO hangout_participants (hangout_id, user_id) VALUES (?, ?)");
const cache = db.prepare(
  "INSERT OR REPLACE INTO translations (source_hash, target_lang, translated) VALUES (?, ?, ?)",
);
const hash = (t) => createHash("sha256").update(t).digest("hex");

function hangout({ host, title, description, category, area, place, startsAt, max, translations }) {
  const id = Number(
    addHangout.run(host, title, description, category, '["ja","en"]', area, place, startsAt, max)
      .lastInsertRowid,
  );
  join.run(id, host);
  // Hand-written translations so the demo works even without an API key.
  for (const [lang, t] of Object.entries(translations)) {
    cache.run(hash(title), lang, t.title);
    cache.run(hash(description), lang, t.description);
  }
  return id;
}

hangout({
  host: emma,
  title: "Coffee and Japanese-English language exchange this Saturday",
  description:
    "Casual chat at a café near Sannomiya. Half the time in Japanese, half in English. All levels welcome. I'm practicing Japanese, so please be patient with me!",
  category: "language_exchange",
  area: "Kobe",
  place: "Café near Sannomiya Station",
  startsAt: nextWeekday(6, 14),
  max: 4,
  translations: {
    ja: {
      title: "今週土曜日、コーヒーを飲みながら日英ランゲージエクスチェンジ",
      description:
        "三宮駅近くのカフェで気軽におしゃべりしましょう。半分は日本語、半分は英語で。レベルは問いません。日本語を練習中なので、ゆっくり話してもらえると嬉しいです！",
    },
  },
});

const games = hangout({
  host: kenta,
  title: "梅田でボードゲーム会",
  description: "初心者歓迎！簡単なゲームから始めます。英語でも日本語でもOK。終わったらたこ焼き食べに行きましょう。",
  category: "board_games",
  area: "Osaka",
  place: "Board game café in Umeda",
  startsAt: nextWeekday(0, 13),
  max: 6,
  translations: {
    en: {
      title: "Board game meetup in Umeda",
      description:
        "Beginners welcome! We'll start with easy games. English or Japanese is fine. Let's go get takoyaki afterwards.",
    },
  },
});
join.run(games, lucas);

hangout({
  host: lucas,
  title: "Morning walk at Fushimi Inari + breakfast",
  description:
    "Beat the crowds with an early walk up the torii gates, then breakfast nearby. Happy to speak English or Portuguese, want to practice Japanese.",
  category: "sightseeing",
  area: "Kyoto",
  place: "Fushimi Inari Station exit",
  startsAt: nextWeekday(6, 7),
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
