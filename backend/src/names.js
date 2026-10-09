// Friendly random nicknames for anonymous users, e.g. "Sunny Tanuki 27".
const ADJECTIVES = [
  "Sunny", "Curious", "Gentle", "Brave", "Sleepy", "Lucky", "Cheerful", "Quiet",
  "Happy", "Calm", "Bright", "Kind", "Witty", "Cozy", "Bold", "Merry",
];
const ANIMALS = [
  "Tanuki", "Kitsune", "Shika", "Shiba", "Neko", "Usagi", "Tsuru", "Koi",
  "Panda", "Fukurou", "Kame", "Risu", "Kuma", "Tako", "Suzume", "Iruka",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const randomName = () => `${pick(ADJECTIVES)} ${pick(ANIMALS)} ${Math.floor(Math.random() * 90) + 10}`;
