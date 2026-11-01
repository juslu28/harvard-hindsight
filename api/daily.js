// GET /api/daily            → today's puzzle: 5 paintings, the same for everyone, answers hidden
// GET /api/daily?reveal=TOK → the answer for one painting, after the player locks in a guess
//
// "Today" runs midnight to midnight, US Eastern time. The 5 paintings are picked with a seeded
// shuffle (seed = the date), and Vercel's CDN caches the response until midnight, so every
// player gets the same set and the museum API is called only a handful of times per day.

import {
  searchObjects, getObject, isPlayable, imageOf, answerOf, learningOf, dateRange, artistOf,
  sealId, openId, sendError,
} from "../lib/harvard.js";

const ZONE = "America/New_York";
const LAUNCH = "2026-11-01"; // puzzle #1
const ROUNDS = 5;

export default async function handler(req, res) {
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const token = params.get("reveal");
    if (token !== null) return await reveal(token, res);

    const now = Date.now();
    const date = etDate(now);
    const nextReset = nextMidnight(now, date);
    const seed = Number(date.replace(/-/g, ""));

    const records = await searchObjects({ sort: `random:${seed}`, size: "100" });
    const picks = pickDaily(records.filter(isPlayable));
    if (picks.length < ROUNDS) {
      const err = new Error("Not enough paintings came back for today's puzzle. Try again shortly.");
      err.status = 502;
      throw err;
    }

    const secondsLeft = Math.max(60, Math.floor((nextReset - now) / 1000));
    res.setHeader("Cache-Control", `public, max-age=0, s-maxage=${secondsLeft}`);
    return res.status(200).json({
      date,
      puzzle: puzzleNumber(date),
      nextReset,
      rounds: picks.map((r) => ({ token: sealId(r.id), image: imageOf(r) })),
    });
  } catch (err) {
    return sendError(res, err);
  }
}

async function reveal(token, res) {
  const id = openId(token);
  if (!id) return res.status(400).json({ error: "Invalid painting token." });
  const r = await getObject(id);
  if (!isPlayable(r)) return res.status(404).json({ error: "Painting not found." });
  // An object's answer never changes, so cache it hard.
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
  return res.status(200).json({ answer: answerOf(r), ...learningOf(r), thumb: imageOf(r).thumb });
}

// Pick 5 varied paintings from the shuffled list: different artists, no more than 2 from one
// culture, and no two from the same 50-year window. Relax the rules only if needed.
function pickDaily(list) {
  const out = [];
  const artists = new Set();
  const cultures = {};
  const windows = {};
  const add = (r) => {
    const { begin, end } = dateRange(r);
    out.push(r);
    artists.add(artistOf(r));
    cultures[r.culture] = (cultures[r.culture] || 0) + 1;
    windows[Math.floor((begin + end) / 100)] = true; // (begin+end)/2 / 50
  };
  for (const r of list) {
    if (out.length >= ROUNDS) break;
    const { begin, end } = dateRange(r);
    const artist = artistOf(r);
    const known = !/unknown|unidentified|anonymous/i.test(artist);
    if (known && artists.has(artist)) continue;
    if ((cultures[r.culture] || 0) >= 2) continue;
    if (windows[Math.floor((begin + end) / 100)]) continue;
    add(r);
  }
  for (const r of list) {
    if (out.length >= ROUNDS) break;
    if (!out.includes(r)) add(r);
  }
  return out;
}

// --- dates in US Eastern time ---------------------------------------------

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtTime = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

function etDate(ms) {
  return fmt.format(new Date(ms)); // "YYYY-MM-DD"
}

function nextMidnight(now, today) {
  const [h, m, s] = fmtTime.format(new Date(now)).split(":").map(Number);
  let t = now + (86400 - (h * 3600 + m * 60 + s)) * 1000;
  t -= t % 1000;
  // Daylight-saving days are 23 or 25 hours long; nudge by an hour if needed.
  if (etDate(t) === today) t += 3600e3;
  if (etDate(t - 3600e3) !== today) t -= 3600e3;
  return t;
}

function puzzleNumber(date) {
  const days = (Date.parse(date + "T00:00:00Z") - Date.parse(LAUNCH + "T00:00:00Z")) / 86400e3;
  return Math.max(1, Math.round(days) + 1);
}
