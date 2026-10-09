// Static, bilingual emergency basics for Japan. Shown on the Help screen even when the
// API is unreachable. Keep this list short and well established.

export const NUMBERS = [
  { number: "119", en: "Fire & ambulance", ja: "消防・救急" },
  { number: "110", en: "Police", ja: "警察" },
  { number: "171", en: "Disaster message dial: leave or hear a voice message for family", ja: "災害用伝言ダイヤル：家族への伝言を録音・再生" },
  { number: "050-3816-2787", en: "Japan Visitor Hotline (JNTO): 24h, English, Chinese, Korean", ja: "訪日外国人向けホットライン（JNTO）：24時間・多言語" },
];

export const APPS = [
  { name: "Safety tips", en: "Official multilingual alerts for earthquakes, tsunami and weather (Japan Tourism Agency)", ja: "観光庁の多言語災害情報アプリ（地震・津波・気象警報）" },
  { name: "NHK WORLD-JAPAN", en: "News and disaster updates in many languages", ja: "多言語のニュースと災害情報" },
];

export const TIPS = {
  earthquake: {
    icon: "🌏",
    en: [
      "Drop, cover and hold on under a sturdy table. Stay away from windows and shelves.",
      "When the shaking stops, turn off the gas and open a door so you can get out.",
      "Use the stairs, not elevators. Expect aftershocks.",
      "Near the coast? Move to high ground right away, even without a warning.",
    ],
    ja: [
      "丈夫な机の下にもぐり、頭を守る。窓や棚から離れる。",
      "揺れがおさまったら火の元を確認し、ドアを開けて出口を確保する。",
      "エレベーターは使わず階段で。余震に注意。",
      "海の近くにいたら、警報がなくてもすぐ高い所へ避難する。",
    ],
  },
  flood: {
    icon: "🌊",
    en: [
      "Follow your city's evacuation level. Level 4 (避難指示) means everyone must evacuate.",
      "Stay out of underpasses, basements and underground malls.",
      "Don't walk or drive through moving water. 20 cm can knock you over.",
      "If it's too late to leave, move to the highest floor of a sturdy building.",
    ],
    ja: [
      "市町村の警戒レベルに従う。レベル4「避難指示」で全員避難。",
      "アンダーパス、地下室、地下街に近づかない。",
      "流れている水の中を歩いたり運転したりしない。",
      "避難が間に合わないときは、頑丈な建物の上の階へ。",
    ],
  },
  typhoon: {
    icon: "🌀",
    en: [
      "Stock water, food, batteries and a charged power bank for 3 days.",
      "Bring in or tie down things on your balcony.",
      "Stay inside, away from windows, until the storm passes.",
    ],
    ja: [
      "水・食料・電池・充電済みモバイルバッテリーを3日分用意。",
      "ベランダの物は室内に入れるか固定する。",
      "通過するまで屋内で、窓から離れて過ごす。",
    ],
  },
};

/** Phrases a foreign resident might need, with reading. Shown as Japanese + English. */
export const PHRASES = [
  { ja: "助けてください", romaji: "Tasukete kudasai", en: "Please help me" },
  { ja: "避難所はどこですか？", romaji: "Hinanjo wa doko desu ka?", en: "Where is the evacuation shelter?" },
  { ja: "けがをしています", romaji: "Kega o shite imasu", en: "I'm injured" },
  { ja: "日本語がわかりません", romaji: "Nihongo ga wakarimasen", en: "I don't understand Japanese" },
  { ja: "英語を話せる人はいますか？", romaji: "Eigo o hanaseru hito wa imasu ka?", en: "Is there anyone who speaks English?" },
  { ja: "水をください", romaji: "Mizu o kudasai", en: "Water, please" },
];

/** Words worth recognizing on signs and alerts. */
export const WORDS = [
  { ja: "避難所", romaji: "hinanjo", en: "evacuation shelter" },
  { ja: "避難指示", romaji: "hinan shiji", en: "evacuation order (Level 4)" },
  { ja: "地震", romaji: "jishin", en: "earthquake" },
  { ja: "津波", romaji: "tsunami", en: "tsunami" },
  { ja: "洪水", romaji: "kōzui", en: "flood" },
  { ja: "台風", romaji: "taifū", en: "typhoon" },
  { ja: "震度", romaji: "shindo", en: "seismic intensity (0–7)" },
  { ja: "停電", romaji: "teiden", en: "power outage" },
];
