// Bilingual icebreakers for random chats. Written in both languages, so no translation call.
export const TOPICS = [
  { en: "What's your favorite place in Kansai so far?", ja: "関西でいちばん好きな場所はどこですか？" },
  { en: "Osaka, Kyoto or Kobe: which food city wins?", ja: "大阪・京都・神戸、食べ物ならどこが一番？" },
  { en: "What's a Japanese word you love the sound of?", ja: "響きが好きな日本語（または英語）の言葉は？" },
  { en: "What's something that surprised you about living here?", ja: "住んでいて驚いたことは何ですか？" },
  { en: "Takoyaki or okonomiyaki? Defend your answer!", ja: "たこ焼きとお好み焼き、どっち派？理由も！" },
  { en: "What did you do last weekend?", ja: "先週末は何をしましたか？" },
  { en: "If you could travel anywhere tomorrow, where would you go?", ja: "明日どこにでも行けるなら、どこに行きたい？" },
  { en: "What's a hobby you'd like to try in Japan?", ja: "日本でやってみたい趣味はありますか？" },
  { en: "What's your go-to convenience store snack?", ja: "コンビニでよく買うお菓子は何ですか？" },
  { en: "Teach each other one phrase you use every day.", ja: "毎日使うフレーズをお互いに一つ教え合おう。" },
  { en: "What's the best season in Kansai, and why?", ja: "関西でいちばん好きな季節は？その理由は？" },
  { en: "Is there a festival or event you'd recommend?", ja: "おすすめのお祭りやイベントはありますか？" },
  { en: "What music have you been listening to lately?", ja: "最近どんな音楽を聴いていますか？" },
  { en: "Hanshin Tigers fan, or not yet?", ja: "阪神タイガースファンですか？" },
];

export const randomTopic = (exclude) => {
  let i;
  do i = Math.floor(Math.random() * TOPICS.length);
  while (i === exclude && TOPICS.length > 1);
  return i;
};
