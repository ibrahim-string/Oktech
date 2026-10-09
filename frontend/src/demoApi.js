/**
 * Browser-only presentation data.
 *
 * This deliberately mirrors the frontend API contract so the UI can be reviewed
 * without a Supabase/Railway setup. It is only activated as a development
 * fallback from api.js when starting a session fails.
 */

const DEMO_KEY = "knot.demo.mode";
const USER_KEY = "knot.demo.user";
const future = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const now = () => new Date().toISOString();

const people = [
  {
    id: 2,
    name: "Mika",
    bio: "Osaka-born community organiser. I love neighbourhood projects, film, and cooking for many people.",
    area: "Osaka",
    is_local: true,
    preferred_lang: "ja",
    speaks: ["ja", "en"],
    learning: ["en"],
    interests: ["mutual aid", "film", "food", "community"],
  },
  {
    id: 3,
    name: "Rafael",
    bio: "Designer and Japanese learner in Kobe. Usually carrying a camera and too many ideas.",
    area: "Kobe",
    is_local: false,
    preferred_lang: "en",
    speaks: ["en", "pt"],
    learning: ["ja"],
    interests: ["music", "photography", "startups", "coffee"],
  },
  {
    id: 4,
    name: "Sora",
    bio: "Kyoto student, volunteer interpreter, and animation obsessive.",
    area: "Kyoto",
    is_local: true,
    preferred_lang: "ja",
    speaks: ["ja", "en"],
    learning: ["en"],
    interests: ["anime", "languages", "volunteering", "walking"],
  },
  {
    id: 5,
    name: "Nora",
    bio: "I make small electronic instruments and enjoy meeting people through making things together.",
    area: "Nara",
    is_local: false,
    preferred_lang: "en",
    speaks: ["en"],
    learning: ["ja"],
    interests: ["music", "making", "nature", "Japanese"],
  },
];

const hangouts = [
  {
    id: 1,
    host_id: 2,
    title: "Kumamoto earthquake aid — packing & volunteer briefing",
    title_ja: "熊本地震支援：物資仕分けとボランティア説明会",
    description:
      "Help sort donated supplies, meet the coordination team, and decide what our Kansai group can do next. New volunteers are very welcome.",
    description_ja:
      "寄付物資の仕分けを手伝い、運営チームと顔を合わせて、関西から次にできることを一緒に決めます。初めての方も大歓迎です。",
    category: "other",
    languages: ["ja", "en"],
    area: "Osaka",
    place_name: "Nakanoshima Community Hub",
    starts_at: future(2, 18),
    max_participants: 18,
    status: "open",
    created_at: future(-1, 12),
  },
  {
    id: 2,
    host_id: 4,
    title: "Language picnic: Japanese × English in the park",
    title_ja: "公園で日本語 × 英語ランゲージ・ピクニック",
    description: "Bring a drink, a blanket, or just yourself. Small rotating conversations for every level.",
    description_ja: "飲み物、レジャーシート、そしてあなた自身を持ってきて。レベルを問わない小さな会話の輪をつくります。",
    category: "language_exchange",
    languages: ["ja", "en"],
    area: "Kyoto",
    place_name: "Okazaki Park lawn",
    starts_at: future(4, 14),
    max_participants: 12,
    status: "open",
    created_at: future(-2, 16),
  },
  {
    id: 3,
    host_id: 3,
    title: "A new anime, then a real conversation",
    title_ja: "新作アニメを観て、ちゃんと話す夜",
    description: "See the new release together, then find a nearby table to swap first impressions and favourite scenes.",
    description_ja: "新作を一緒に観て、そのあと近くのテーブルで第一印象や好きなシーンを語りましょう。",
    category: "culture",
    languages: ["ja", "en"],
    area: "Kobe",
    place_name: "Sannomiya cinema foyer",
    starts_at: future(5, 19),
    max_participants: 8,
    status: "open",
    created_at: future(-1, 9),
  },
  {
    id: 4,
    host_id: 5,
    title: "Make a tiny instrument together",
    title_ja: "小さな楽器を一緒につくろう",
    description: "A low-pressure afternoon of paper circuits, sound experiments, and collaborative noise.",
    description_ja: "紙の回路、音の実験、いっしょにつくるノイズ。気軽に参加できる午後です。",
    category: "other",
    languages: ["ja", "en"],
    area: "Nara",
    place_name: "Machiya Makers Room",
    starts_at: future(7, 13),
    max_participants: 10,
    status: "open",
    created_at: future(-3, 10),
  },
  {
    id: 5,
    host_id: 2,
    title: "Civic startup sketch night",
    title_ja: "まちのためのスタートアップ・スケッチナイト",
    description: "Bring one problem you notice in Kansai. We will draw possible fixes before deciding whether to make one real.",
    description_ja: "関西で気になっている問題をひとつ持ってきてください。実際につくるか決める前に、解決案をスケッチします。",
    category: "coffee",
    languages: ["ja", "en"],
    area: "Osaka",
    place_name: "Kitahama shared studio",
    starts_at: future(9, 18),
    max_participants: 9,
    status: "open",
    created_at: future(-4, 13),
  },
];

const participants = new Map([
  [1, [2, 4]],
  [2, [4, 2]],
  [3, [3]],
  [4, [5]],
  [5, [2, 3]],
]);

const actionMessages = new Map([
  [
    1,
    [
      { id: 1, sender_id: 2, sender_name: "Mika", body: "Thanks for joining. We will share a simple packing list tomorrow.", created_at: future(-1, 19), kind: "text" },
      { id: 2, sender_id: 4, sender_name: "Sora", body: "I can help interpret for anyone who needs English support.", created_at: future(-1, 20), kind: "text" },
    ],
  ],
]);

const aidPosts = [
  {
    id: 1,
    user_id: 4,
    kind: "offer",
    category: "interpreting",
    title: "Japanese–English interpretation for volunteer briefings",
    body: "Available in Osaka on Saturday afternoon. Happy to support first-time volunteers.",
    area: "Osaka",
    created_at: future(-1, 15),
    status: "open",
  },
  {
    id: 2,
    user_id: 3,
    kind: "need",
    category: "transport",
    title: "Looking for a van to move boxed donations",
    body: "One short trip from Kobe to the Osaka hub. Fuel costs will be covered.",
    area: "Kobe",
    created_at: future(-1, 11),
    status: "open",
  },
];

const topics = [
  { en: "What is one small place in Kansai you would show a new friend?", ja: "新しい友だちに関西のどんな小さな場所を案内したいですか？" },
  { en: "What are you trying to make more space for this year?", ja: "今年、もっと時間をつくりたいことは何ですか？" },
  { en: "What local problem would you fix if ten people said yes?", ja: "10人が「やる」と言ったら、どんな地域の問題を解決したいですか？" },
];

let nextId = 100;
let conversations = [];
let conversationMessages = new Map();
let alerts = [];
let checkins = new Map();

function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Presentation mode works without storage too. */
  }
}

function savedUser() {
  try {
    return JSON.parse(storageGet(USER_KEY) ?? "null");
  } catch {
    return null;
  }
}

function viewer() {
  const user = savedUser();
  if (!user) throw new Error("Start a demo session first.");
  return user;
}

function saveUser(user) {
  storageSet(USER_KEY, JSON.stringify(user));
  return user;
}

function findPerson(id) {
  if (Number(id) === viewer().id) return viewer();
  return people.find((person) => person.id === Number(id));
}

function publicProfile(person) {
  if (!person) return null;
  const { id, name, bio, area, is_local, preferred_lang, speaks, learning, interests } = person;
  return { id, name, bio, area, is_local, preferred_lang, speaks, learning, interests };
}

function languageMatch(me, host) {
  return {
    you_can_help_with: me.speaks.filter((lang) => host.learning.includes(lang)),
    you_can_practice: me.learning.filter((lang) => host.speaks.includes(lang)),
  };
}

function translated(h, field) {
  const japanese = viewer().preferred_lang === "ja";
  return japanese && h[`${field}_ja`] ? h[`${field}_ja`] : h[field];
}

function presentHangout(h, includePeople = false) {
  const me = viewer();
  const ids = participants.get(h.id) ?? [];
  const host = findPerson(h.host_id);
  const result = {
    ...h,
    title: translated(h, "title"),
    description: translated(h, "description"),
    original: { title: h.title, description: h.description },
    translated: viewer().preferred_lang === "ja" && Boolean(h.title_ja || h.description_ja),
    display_lang: viewer().preferred_lang,
    host: publicProfile(host),
    participant_count: ids.length,
    spots_left: Math.max(0, h.max_participants - ids.length),
    joined: ids.includes(me.id),
    language_match: languageMatch(me, host),
  };
  if (includePeople) {
    result.participants = ids.map((id) => ({ ...publicProfile(findPerson(id)), joined_at: h.created_at }));
    const interestCounts = new Map();
    result.participants.forEach((person) => person.interests.forEach((interest) => interestCounts.set(interest, (interestCounts.get(interest) ?? 0) + 1)));
    result.shared_interests = [...interestCounts].filter(([, n]) => n >= 2).map(([interest]) => interest);
  }
  return result;
}

function message(record) {
  return { ...record, text: record.body, translated: false, display_lang: viewer().preferred_lang };
}

function conversationPartner(conversation) {
  return conversation.members.map(findPerson).find((person) => person?.id !== viewer().id) ?? null;
}

function presentConversation(conversation) {
  const partner = conversationPartner(conversation);
  const aid = conversation.aid_post_id && aidPosts.find((post) => post.id === conversation.aid_post_id);
  return {
    id: conversation.id,
    kind: conversation.kind,
    created_at: conversation.created_at,
    topic: conversation.topic == null ? null : topics[conversation.topic % topics.length],
    partner: publicProfile(partner),
    partner_left: Boolean(conversation.partner_left),
    language_match: partner ? languageMatch(viewer(), partner) : null,
    aid_post: aid && { ...aid, author: publicProfile(findPerson(aid.user_id)) },
  };
}

function addConversation({ kind, partnerId, aidPostId = null }) {
  const conversation = {
    id: nextId++,
    kind,
    members: [viewer().id, partnerId],
    aid_post_id: aidPostId,
    topic: kind === "random" ? 0 : null,
    created_at: now(),
    partner_left: false,
    mine_left: false,
  };
  conversations = [conversation, ...conversations];
  conversationMessages.set(conversation.id, []);
  return conversation;
}

export const isDemoMode = () => storageGet(DEMO_KEY) === "1";

export function activateDemoMode() {
  storageSet(DEMO_KEY, "1");
}

export const demoApi = {
  randomName: async () => ({ name: ["Aoi", "Kai", "Momo", "Ren", "Hana"][Math.floor(Math.random() * 5)] }),

  startSession: async (form) => {
    const user = saveUser({
      id: 1000,
      name: String(form.name || "KNOT visitor").trim() || "KNOT visitor",
      bio: "",
      area: form.area || "Osaka",
      is_local: Boolean(form.is_local),
      preferred_lang: form.preferred_lang || "en",
      speaks: form.speaks?.length ? form.speaks : ["en"],
      learning: form.learning ?? ["ja"],
      interests: ["community", "new friends"],
    });
    return { token: "demo-session", user };
  },

  me: async () => viewer(),
  updateMe: async (changes) => saveUser({ ...viewer(), ...changes }),

  feed: async ({ area, category } = {}) =>
    hangouts
      .filter((h) => h.status === "open" && (!area || h.area === area) && (!category || h.category === category))
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .map((h) => presentHangout(h)),

  hangout: async (id) => {
    const h = hangouts.find((item) => item.id === Number(id));
    if (!h) throw new Error("Action not found");
    return presentHangout(h, true);
  },

  createHangout: async (form) => {
    const h = {
      id: ++nextId,
      host_id: viewer().id,
      title: form.title,
      description: form.description ?? "",
      category: form.category ?? "other",
      languages: form.languages?.length ? form.languages : ["ja", "en"],
      area: form.area,
      place_name: form.place_name,
      starts_at: form.starts_at,
      max_participants: Number(form.max_participants ?? 8),
      status: "open",
      created_at: now(),
    };
    hangouts.unshift(h);
    participants.set(h.id, [viewer().id]);
    actionMessages.set(h.id, []);
    return presentHangout(h);
  },

  join: async (id) => {
    const h = hangouts.find((item) => item.id === Number(id));
    if (!h) throw new Error("Action not found");
    const ids = participants.get(h.id) ?? [];
    if (!ids.includes(viewer().id)) ids.push(viewer().id);
    participants.set(h.id, ids);
    return presentHangout(h);
  },

  leave: async (id) => {
    const h = hangouts.find((item) => item.id === Number(id));
    if (!h) throw new Error("Action not found");
    participants.set(h.id, (participants.get(h.id) ?? []).filter((personId) => personId !== viewer().id));
    return presentHangout(h);
  },

  messages: async (id, after = 0) => (actionMessages.get(Number(id)) ?? []).filter((m) => m.id > Number(after)).map(message),
  sendMessage: async (id, body) => {
    const entries = actionMessages.get(Number(id)) ?? [];
    const entry = { id: ++nextId, sender_id: viewer().id, sender_name: viewer().name, body, kind: "text", created_at: now() };
    entries.push(entry);
    actionMessages.set(Number(id), entries);
    return message(entry);
  },

  translate: async (text) => ({ text, translated: false }),

  match: async () => {
    const partner = people.find((person) => person.id === 3) ?? people[0];
    const existing = conversations.find((conversation) => conversation.kind === "random" && conversation.members.includes(viewer().id) && conversation.members.includes(partner.id));
    const conversation = existing ?? addConversation({ kind: "random", partnerId: partner.id });
    return { status: "matched", conversation_id: conversation.id, others_waiting: 3 };
  },
  cancelMatch: async () => ({ ok: true }),
  conversations: async () =>
    conversations
      .filter((conversation) => conversation.members.includes(viewer().id) && !conversation.mine_left)
      .map((conversation) => {
        const latest = (conversationMessages.get(conversation.id) ?? []).at(-1);
        return {
          ...presentConversation(conversation),
          partner_left_at: conversation.partner_left ? now() : null,
          last_body: latest?.body ?? "",
          last_kind: latest?.kind ?? null,
          last_sender_id: latest?.sender_id ?? null,
          last_at: latest?.created_at ?? conversation.created_at,
        };
      }),
  conversation: async (id) => {
    const conversation = conversations.find((item) => item.id === Number(id));
    if (!conversation || !conversation.members.includes(viewer().id)) throw new Error("Chat not found");
    return presentConversation(conversation);
  },
  conversationMessages: async (id, after = 0) => (conversationMessages.get(Number(id)) ?? []).filter((m) => m.id > Number(after)).map(message),
  sendConversationMessage: async (id, body) => {
    const entries = conversationMessages.get(Number(id)) ?? [];
    const entry = { id: ++nextId, sender_id: viewer().id, sender_name: viewer().name, body, kind: "text", created_at: now() };
    entries.push(entry);
    conversationMessages.set(Number(id), entries);
    return message(entry);
  },
  newTopic: async (id) => {
    const conversation = conversations.find((item) => item.id === Number(id));
    if (!conversation) throw new Error("Chat not found");
    conversation.topic = ((conversation.topic ?? -1) + 1) % topics.length;
    const entries = conversationMessages.get(conversation.id) ?? [];
    entries.push({ id: ++nextId, sender_id: viewer().id, sender_name: viewer().name, body: String(conversation.topic), kind: "topic", created_at: now() });
    return { topic: topics[conversation.topic] };
  },
  leaveConversation: async (id) => {
    const conversation = conversations.find((item) => item.id === Number(id));
    if (conversation) conversation.mine_left = true;
    return { ok: true };
  },
  report: async (id) => demoApi.leaveConversation(id),

  safety: async () => {
    const me = viewer();
    const status = checkins.get(me.id);
    const grouped = new Map();
    checkins.forEach((value, id) => {
      const person = findPerson(id);
      const key = `${person.area}:${value}`;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return {
      emergency: alerts.some((alert) => alert.active),
      alerts: alerts.filter((alert) => alert.active),
      quakes: [],
      checkins: [...grouped].map(([key, n]) => {
        const [area, checkinStatus] = key.split(":");
        return { area, status: checkinStatus, n };
      }),
      my_checkin: status ? { status, updated_at: now() } : null,
    };
  },
  checkin: async (status) => {
    checkins.set(viewer().id, status);
    return { status, updated_at: now() };
  },
  aid: async ({ kind } = {}) =>
    aidPosts
      .filter((post) => post.status === "open" && (!kind || post.kind === kind))
      .map((post) => ({ ...post, original: { title: post.title, body: post.body }, translated: false, author: publicProfile(findPerson(post.user_id)), mine: post.user_id === viewer().id })),
  createAid: async (form) => {
    const post = { id: ++nextId, user_id: viewer().id, ...form, created_at: now(), status: "open" };
    aidPosts.unshift(post);
    return post;
  },
  respondAid: async (id) => {
    const post = aidPosts.find((item) => item.id === Number(id));
    if (!post) throw new Error("Aid post not found");
    const existing = conversations.find((conversation) => conversation.aid_post_id === post.id && conversation.members.includes(viewer().id));
    const conversation = existing ?? addConversation({ kind: "aid", partnerId: post.user_id, aidPostId: post.id });
    return { conversation_id: conversation.id };
  },
  resolveAid: async (id) => {
    const post = aidPosts.find((item) => item.id === Number(id));
    if (post) post.status = "resolved";
    return post;
  },
  createAlert: async (form) => {
    const alert = { id: ++nextId, ...form, active: true, auto: false, created_at: now() };
    alerts.unshift(alert);
    return alert;
  },
  endAlert: async (id) => {
    const alert = alerts.find((item) => item.id === Number(id));
    if (alert) alert.active = false;
    return { ok: true };
  },
};
