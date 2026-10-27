// Vercel Serverless Function: GET /api/artworks
//
// This runs on Vercel's servers, NOT in the visitor's browser.
// It reads your Harvard Art Museums API key from an environment variable,
// asks the museum for a batch of random paintings, trims the response down
// to just what the game needs, and sends that to the browser.
// The key itself never leaves the server.

import { buildClues, museumNote } from "../lib/clues.js";

const API_URL = "https://api.harvardartmuseums.org/object";
const ROUNDS = 5;

export default async function handler(req, res) {
  const learn = new URL(req.url, "http://x").searchParams.get("mode") === "learn";
  const apiKey = process.env.HARVARD_ART_MUSEUMS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "Server is missing HARVARD_ART_MUSEUMS_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    });
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    classification: "Paintings",
    hasimage: "1",
    q: "imagepermissionlevel:0", // only images we're allowed to show at full size
    yearmade: "1300-2020",
    sort: "random",
    size: "40", // over-fetch, then filter down to clean rounds
    fields: [
      "id",
      "title",
      "dated",
      "datebegin",
      "dateend",
      "primaryimageurl",
      "people",
      "culture",
      "medium",
      "url",
      "colors",
      // extra catalog fields used for Learn-mode clues
      "period",
      "labeltext",
      "contextualtext",
      "description",
      "commentary",
    ].join(","),
  });

  try {
    const upstream = await fetch(`${API_URL}?${params}`);

    if (!upstream.ok) {
      // Don't echo upstream details back (they could include the request URL with the key).
      return res
        .status(502)
        .json({ error: `Harvard Art Museums API returned ${upstream.status}` });
    }

    const data = await upstream.json();
    let playable = (data.records || []).filter(isPlayable);
    if (learn) {
      // Prefer paintings with more sourced clues (stable sort keeps the random order otherwise).
      playable = playable
        .map((r) => ({ r, n: buildClues(r).length }))
        .sort((a, b) => Math.min(b.n, 3) - Math.min(a.n, 3))
        .map((x) => x.r);
    }
    const rounds = playable.slice(0, ROUNDS).map((r) => toRound(r, learn));

    if (rounds.length === 0) {
      return res.status(502).json({ error: "No playable artworks came back. Try again." });
    }

    // Each request should be a fresh random set, so don't cache.
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ rounds });
  } catch (err) {
    return res.status(500).json({ error: "Could not reach the Harvard Art Museums API." });
  }
}

function isPlayable(r) {
  return (
    r.primaryimageurl &&
    Number.isFinite(r.datebegin) &&
    r.datebegin > 0 &&
    // skip works whose date range is too vague to make a fair question
    (!r.dateend || r.dateend - r.datebegin <= 60)
  );
}

function toRound(r, learn) {
  const begin = r.datebegin;
  const end = r.dateend && r.dateend >= begin ? r.dateend : begin;
  const artist = (r.people || []).find((p) => p.role === "Artist") || (r.people || [])[0];

  return {
    id: r.id,
    image: `${r.primaryimageurl}?width=1200`,
    title: r.title || "Untitled",
    artist: artist ? artist.name : "Unknown artist",
    dated: r.dated || String(begin),
    begin,
    end,
    culture: r.culture || null,
    medium: r.medium || null,
    url: r.url,
    // Top 6 colors the museum extracted from the image, largest share first
    palette: (r.colors || [])
      .slice()
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6)
      .map((c) => ({ hex: c.color, percent: c.percent, name: c.css3 || c.hue })),
    ...(learn && {
      clues: buildClues(r),
      note: museumNote(r),
      // the raw catalog values the clues were built from, so they can be checked
      catalog: {
        culture: r.culture || null,
        medium: r.medium || null,
        period: r.period || null,
        artist: artist ? { name: artist.name, role: artist.role, prefix: artist.prefix || null, displaydate: artist.displaydate || null } : null,
      },
    }),
  };
}
