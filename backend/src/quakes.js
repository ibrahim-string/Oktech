// Recent earthquakes in Japan from P2PQuake (https://www.p2pquake.net/develop/json_api_v2/),
// which republishes Japan Meteorological Agency (気象庁) reports as JSON.
const FEED = "https://api.p2pquake.net/v2/history?codes=551&limit=20";
const CACHE_MS = 60_000;

export const KANSAI_PREFS = {
  "大阪府": "Osaka",
  "京都府": "Kyoto",
  "兵庫県": "Kobe",  // Hyogo; Kobe is the app's area name for it
  "奈良県": "Nara",
  "滋賀県": "Shiga",
  "和歌山県": "Wakayama",
};

/** JMA seismic intensity (shindo) codes used by P2PQuake → display label. */
const SHINDO = { 10: "1", 20: "2", 30: "3", 40: "4", 45: "5-", 50: "5+", 55: "6-", 60: "6+", 70: "7" };
export const STRONG_SHAKING = 45; // shindo 5- and up: damage possible

let cache = { at: 0, data: [] };

/** "2026/10/09 11:12:00" (JST) → ISO string. */
const jstToIso = (s) => new Date(s.replace(/\//g, "-").replace(" ", "T") + "+09:00").toISOString();

export async function recentQuakes() {
  if (Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const res = await fetch(FEED, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    const data = items
      .filter((q) => q.earthquake?.hypocenter && q.issue?.type !== "Foreign")
      .map((q) => {
        const eq = q.earthquake;
        // Highest intensity observed in each Kansai prefecture.
        const kansai = {};
        for (const p of q.points ?? []) {
          const area = KANSAI_PREFS[p.pref];
          if (area && p.scale > (kansai[area] ?? 0)) kansai[area] = p.scale;
        }
        return {
          id: q.id,
          time: jstToIso(eq.time),
          place: eq.hypocenter.name || "",
          magnitude: eq.hypocenter.magnitude > 0 ? eq.hypocenter.magnitude : null,
          depth_km: eq.hypocenter.depth >= 0 ? eq.hypocenter.depth : null,
          max_scale: eq.maxScale ?? -1,
          max_shindo: SHINDO[eq.maxScale] ?? null,
          tsunami: eq.domesticTsunami && !["None", "Unknown", "Checking"].includes(eq.domesticTsunami)
            ? eq.domesticTsunami
            : null,
          kansai: Object.entries(kansai).map(([area, scale]) => ({ area, scale, shindo: SHINDO[scale] ?? null })),
        };
      });
    cache = { at: Date.now(), data };
  } catch (err) {
    console.warn("[quakes] feed unavailable:", err.message);
    cache.at = Date.now() - CACHE_MS + 15_000; // retry in 15s, keep serving the old data
  }
  return cache.data;
}
