// Shared helpers for talking to the Harvard Art Museums API (server-side only).
// The API key is read from the HARVARD_ART_MUSEUMS_API_KEY environment variable
// and never leaves Vercel's servers.

import crypto from "node:crypto";
import { buildClues, museumNote } from "./clues.js";

const API_URL = "https://api.harvardartmuseums.org/object";

// Every game painting comes from this pool: paintings with a full-size image, dated 1300–2020.
export const BASE_FILTERS = {
  classification: "Paintings",
  hasimage: "1",
  q: "imagepermissionlevel:0", // only images the museum allows at full size
  yearmade: "1300-2020",
};

export const FIELDS = [
  "id", "title", "dated", "datebegin", "dateend", "primaryimageurl", "images",
  "people", "culture", "medium", "url", "colors", "period",
  "labeltext", "contextualtext", "description", "commentary",
].join(",");

export function apiKey() {
  const key = process.env.HARVARD_ART_MUSEUMS_API_KEY;
  if (!key) {
    const err = new Error(
      "Server is missing HARVARD_ART_MUSEUMS_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy."
    );
    err.status = 500;
    throw err;
  }
  return key;
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    // Never echo the upstream URL back: it contains the API key.
    const err = new Error(`Harvard Art Museums API returned ${res.status}`);
    err.status = res.status === 404 ? 404 : 502;
    throw err;
  }
  return res.json();
}

export async function searchObjects(params) {
  const qs = new URLSearchParams({ apikey: apiKey(), fields: FIELDS, ...BASE_FILTERS, ...params });
  const data = await getJSON(`${API_URL}?${qs}`);
  return data.records || [];
}

export async function getObject(id) {
  const qs = new URLSearchParams({ apikey: apiKey() });
  return getJSON(`${API_URL}/${encodeURIComponent(id)}?${qs}`);
}

// A painting is playable if it has an image and a date range narrow enough to be a fair question.
export function isPlayable(r) {
  return (
    r &&
    r.primaryimageurl &&
    Number.isFinite(r.datebegin) &&
    r.datebegin > 0 &&
    (!r.dateend || r.dateend - r.datebegin <= 60)
  );
}

export function dateRange(r) {
  const begin = r.datebegin;
  const end = r.dateend && r.dateend >= begin ? r.dateend : begin;
  return { begin, end };
}

export function artistOf(r) {
  const people = r.people || [];
  const a = people.find((p) => p.role === "Artist") || people[0];
  return a ? a.name : "Unknown artist";
}

// Image URLs for display, the hover loupe, thumbnails, and the deep-zoom viewer (IIIF).
export function imageOf(r) {
  const base = r.primaryimageurl;
  const imgs = r.images || [];
  const img = imgs.find((i) => i.baseimageurl === base) || imgs[0] || {};
  const w = Number(img.width) || 0;
  const h = Number(img.height) || 0;
  // The museum's image server enlarges images as well as shrinking them, so size each
  // request by its longest side and never ask for more pixels than the original has.
  const sized = (longSide) => {
    if (!w || !h) return `${base}?width=${longSide}`;
    const scale = Math.min(1, longSide / Math.max(w, h));
    return `${base}?width=${Math.max(1, Math.round(w * scale))}`;
  };
  // IIIF deep-zoom service. Newer records leave out iiifbaseuri, but the service accepts
  // the image's IDS id. (zoom.js can also work it out in the browser if both are missing.)
  const iiif = img.iiifbaseuri || (img.idsid ? `https://ids.lib.harvard.edu/ids/iiif/${img.idsid}` : null);
  return {
    src: sized(1800),
    hires: sized(3000),
    thumb: sized(480),
    iiif,
    width: w || null,
    height: h || null,
  };
}

// Everything revealed after a guess.
export function answerOf(r) {
  const { begin, end } = dateRange(r);
  return {
    begin,
    end,
    dated: r.dated || String(begin),
    title: r.title || "Untitled",
    artist: artistOf(r),
    culture: r.culture || null,
    medium: r.medium || null,
    period: r.period || null,
    url: r.url || null,
    palette: (r.colors || [])
      .slice()
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6)
      .map((c) => ({ hex: c.color, percent: c.percent })),
  };
}

export function learningOf(r) {
  return { clues: buildClues(r), note: museumNote(r) };
}

// ---------------------------------------------------------------------------
// Sealed tokens: the daily puzzle hands the browser an encrypted object id instead of the
// real one, so the answer can't be looked up before guessing. Deterministic per id so CDN
// caching works. The encryption key is derived from the API key (no extra setup needed).
// ---------------------------------------------------------------------------

function tokenKey() {
  return crypto.createHash("sha256").update("hindsight-token:" + apiKey()).digest();
}

export function sealId(id) {
  const key = tokenKey();
  const iv = crypto.createHmac("sha256", key).update(String(id)).digest().subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(String(id), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

export function openId(token) {
  try {
    if (typeof token !== "string" || token.length > 120) return null;
    const buf = Buffer.from(token, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", tokenKey(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const id = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
    return /^\d{1,10}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function sendError(res, err) {
  const status = err.status || 500;
  const msg = status === 500 && !err.status ? "Could not reach the Harvard Art Museums API." : err.message;
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json({ error: msg });
}
