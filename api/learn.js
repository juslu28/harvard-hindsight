// GET /api/learn?batch=N → a batch of playable paintings for endless Learn mode, with
// sourced clues and visual hallmarks. Each batch number is a fixed seeded shuffle, so Vercel's
// CDN can cache it for a day. The browser picks random batch numbers and skips repeats.

import { searchObjects, isPlayable, imageOf, answerOf, learningOf, sendError } from "../lib/harvard.js";

export default async function handler(req, res) {
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const n = parseInt(params.get("batch"), 10);
    const batch = Number.isFinite(n) && n >= 1 && n <= 100000 ? n : 1 + Math.floor(Math.random() * 3000);

    const records = await searchObjects({ sort: `random:${batch}`, size: "60" });
    const rounds = records.filter(isPlayable).map((r) => ({
      id: r.id,
      image: imageOf(r),
      answer: answerOf(r),
      ...learningOf(r),
    }));

    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    return res.status(200).json({ batch, rounds });
  } catch (err) {
    return sendError(res, err);
  }
}
