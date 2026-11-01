// Hindsight: game logic. There is no API key here. The browser only talks to this
// site's own /api/daily and /api/learn endpoints.

import { initFx, burst, buildSalon, stopLoupe } from "./fx.js";
import { initZoom, openZoom, closeZoom, isZoomOpen, zoomBy } from "./zoom.js";

const MIN_YEAR = 1300;
const MAX_YEAR = 2020;
const START_YEAR = 1650;
const ROUNDS = 5;
const TIER_EMOJI = { perfect: "🎯", green: "🟩", yellow: "🟨", red: "🟥" };

const $ = (id) => document.getElementById(id);
const el = {
  body: document.body,
  home: $("screen-home"), game: $("screen-game"), results: $("screen-results"), summary: $("screen-summary"),
  center: $("topbar-center"), endLearn: $("end-learn"),
  dailyCard: $("daily-card"), dailyKicker: $("daily-kicker"), dailyDesc: $("daily-desc"), dailyCta: $("daily-cta"),
  learnCard: $("learn-card"), homeFoot: $("home-foot"),
  art: $("art"), artLoading: $("art-loading"), artError: $("art-error"), artRetry: $("art-retry"),
  zoomBtn: $("zoom-btn"), wallLabel: $("wall-label"), panel: $("panel"),
  roundLabel: $("round-label"), prompt: $("prompt"),
  clueArea: $("clue-area"), clueList: $("clue-list"), revealClue: $("reveal-clue"), noClues: $("no-clues"),
  guess: $("guess"), yearInput: $("year-input"), yearHint: $("year-hint"), ruler: $("ruler"),
  ticks: $("ruler-ticks"), band: $("ruler-band"), bandLabel: $("ruler-band-label"), pin: $("ruler-pin"), pinLabel: $("ruler-pin-label"),
  slider: $("slider"), lock: $("lock"), keysHint: $("keys-hint"),
  result: $("result"), tierChip: $("tier-chip"), resultOff: $("result-off"), resultSub: $("result-sub"), resultPoints: $("result-points"),
  why: $("why"), whyToggle: $("why-toggle"), whyList: $("why-list"), note: $("museum-note"), noteText: $("museum-note-text"), noteLink: $("museum-note-link"),
  next: $("next"),
  modal: $("modal"), modalBody: $("modal-body"), modalX: $("modal-x"), toast: $("toast"),
};

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pct = (y) => (clamp(y, MIN_YEAR, MAX_YEAR) - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
const fmt = (n) => Number(n).toLocaleString("en-US");

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("hindsight:" + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("hindsight:" + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

async function fetchJSON(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

function scoreOf(guess, a) {
  const off = guess < a.begin ? a.begin - guess : guess > a.end ? guess - a.end : 0;
  const points = Math.round(1000 * Math.exp(-off / 75));
  const tier = off === 0 ? "perfect" : off <= 25 ? "green" : off <= 75 ? "yellow" : "red";
  return { off, points, tier };
}

function sqHTML(tier, extra = "") {
  return `<span class="sq ${tier ? "t-" + tier : ""} ${extra}">${tier === "perfect" ? "★" : ""}</span>`;
}

function prettyDate(iso) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function countdownText(target) {
  const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

function animateNumber(node, to, ms = 900, suffix = "") {
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    node.firstChild.nodeValue = fmt(Math.round(to * eased)) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  if (!node.firstChild) node.appendChild(document.createTextNode("0"));
  requestAnimationFrame(step);
}

let toastTimer = null;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
}

// ---------------------------------------------------------------------------
// screens
// ---------------------------------------------------------------------------
let screen = "home";
function show(name) {
  screen = name;
  for (const s of ["home", "game", "results", "summary"]) el[s].classList.toggle("hidden", s !== name);
  el.body.classList.toggle("is-home", name === "home");
  el.body.classList.toggle("is-game", name === "game");
  el.endLearn.classList.toggle("hidden", !(name === "game" && mode === "learn"));
  if (name !== "game") { el.center.innerHTML = ""; stopLoupe(); }
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// statistics (stored in this browser)
// ---------------------------------------------------------------------------
function getStats() {
  return store.get("stats", { played: 0, streak: 0, maxStreak: 0, lastDate: null, best: 0, total: 0, dist: [0, 0, 0, 0, 0], history: {} });
}

function dayBefore(iso) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function recordDaily(date, score) {
  const s = getStats();
  if (s.history[date] !== undefined) return s;
  s.history[date] = score;
  s.played += 1;
  s.total += score;
  s.best = Math.max(s.best, score);
  s.streak = s.lastDate === dayBefore(date) ? s.streak + 1 : 1;
  s.maxStreak = Math.max(s.maxStreak, s.streak);
  s.lastDate = date;
  s.dist[Math.min(4, Math.floor(score / 1000))] += 1;
  store.set("stats", s);
  return s;
}

function currentStreak(s) {
  if (!s.lastDate || !daily) return s.streak;
  return s.lastDate === daily.date || s.lastDate === dayBefore(daily.date) ? s.streak : 0;
}

// ---------------------------------------------------------------------------
// home
// ---------------------------------------------------------------------------
let daily = null; // { date, puzzle, nextReset, rounds: [{ token, image }] }
let dailyError = null;

async function loadDaily() {
  dailyError = null;
  try {
    daily = await fetchJSON("/api/daily");
  } catch (err) {
    daily = null;
    dailyError = err.message;
  }
  renderHome();
}

function dailyState() {
  if (!daily) return null;
  return store.get("daily:" + daily.date, null);
}

function renderHome() {
  const s = getStats();
  if (dailyError) {
    el.dailyKicker.textContent = "Daily challenge";
    el.dailyDesc.textContent = "Today's puzzle couldn't be loaded.";
    el.dailyCta.innerHTML = `${esc(dailyError)} <span aria-hidden="true">· Try again →</span>`;
  } else if (!daily) {
    el.dailyCta.textContent = "Loading today's puzzle…";
  } else {
    const st = dailyState();
    el.dailyKicker.textContent = `Daily challenge · #${daily.puzzle}`;
    if (st && st.done) {
      const total = st.results.reduce((a, r) => a + r.points, 0);
      el.dailyDesc.textContent = "You've played today's five. Come back tomorrow for a new set.";
      el.dailyCta.innerHTML = `<span class="squares">${st.results.map((r) => sqHTML(r.tier)).join("")}</span> ${fmt(total)} pts · next in <span class="countdown" data-target="${daily.nextReset}">${countdownText(daily.nextReset)}</span>`;
    } else if (st && st.results.length) {
      el.dailyDesc.textContent = `${prettyDate(daily.date)}. You're partway through.`;
      el.dailyCta.innerHTML = `Resume · painting ${st.results.length + 1} of ${ROUNDS} <span aria-hidden="true">→</span>`;
    } else {
      el.dailyDesc.textContent = `${prettyDate(daily.date)}. Five paintings, the same for everyone. One try.`;
      el.dailyCta.innerHTML = `Play today's puzzle <span aria-hidden="true">→</span>`;
    }
  }
  const streak = currentStreak(s);
  el.homeFoot.innerHTML = s.played
    ? `${streak > 0 ? `<b>${streak}-day streak</b> · ` : ""}${s.played} played · best <b>${fmt(s.best)}</b>`
    : `New here? Press <kbd>?</kbd> for how to play.`;
}

// ---------------------------------------------------------------------------
// shared round UI
// ---------------------------------------------------------------------------
let mode = null; // "daily" | "learn"
const game = { round: null, index: 0, guess: START_YEAR, revealed: false, locking: false, shown: 0 };
let artJob = 0;

function buildTicks() {
  let html = "";
  for (let y = MIN_YEAR; y <= MAX_YEAR; y += 10) {
    const cls = y % 100 === 0 ? "major" : y % 50 === 0 ? "mid" : "";
    html += `<span class="tick ${cls}" style="left:${(pct(y) * 100).toFixed(3)}%"></span>`;
    if (y % 100 === 0) html += `<span class="tick-label" style="left:${(pct(y) * 100).toFixed(3)}%">${y}</span>`;
  }
  el.ticks.innerHTML = html;
}

function setGuess(y, { keepInput = false } = {}) {
  const v = clamp(Math.round(Number(y) || START_YEAR), MIN_YEAR, MAX_YEAR);
  game.guess = v;
  el.slider.value = v;
  if (!keepInput) el.yearInput.value = v;
  el.pin.style.setProperty("--p", pct(v));
}

function loadArt(image) {
  const job = ++artJob;
  el.art.classList.remove("loaded");
  el.art.removeAttribute("src");
  el.artLoading.classList.remove("hidden");
  el.artError.classList.add("hidden");
  el.art.dataset.hires = image.hires;
  el.art.onload = () => {
    if (job !== artJob) return;
    el.art.classList.add("loaded");
    el.artLoading.classList.add("hidden");
  };
  el.art.onerror = () => {
    if (job !== artJob) return;
    el.artLoading.classList.add("hidden");
    if (mode === "learn" && !game.revealed) {
      toast("Skipped a painting whose image didn't load.");
      nextLearn();
    } else {
      el.artError.classList.remove("hidden");
    }
  };
  el.art.src = image.src;
}

function preload(images) {
  for (const img of images) if (img) new Image().src = img.src;
}

function renderLabel(a) {
  if (!a) {
    el.wallLabel.classList.remove("revealed");
    el.wallLabel.innerHTML = `<div class="wl-blank"><div class="bar t"></div><div class="bar a"></div><div class="bar m"></div><em>The museum label appears after your guess.</em></div>`;
    return;
  }
  const palette = (a.palette || []).length
    ? `<span class="palette" title="Main colors, measured by the museum">${a.palette.map((c) => `<span style="background:${esc(c.hex)};flex:${c.percent}"></span>`).join("")}</span>`
    : "<span></span>";
  el.wallLabel.classList.add("revealed");
  el.wallLabel.innerHTML = `
    <p class="wl-title">${esc(a.title)}</p>
    <p class="wl-artist">${esc(a.artist)}</p>
    <p class="wl-meta">${esc([a.dated, a.culture].filter(Boolean).join(" · "))}</p>
    ${a.medium ? `<p class="wl-medium">${esc(a.medium)}</p>` : ""}
    <div class="wl-foot">${palette}${a.url ? `<a class="wl-link" href="${esc(a.url)}" target="_blank" rel="noopener">View at Harvard Art Museums ↗</a>` : ""}</div>`;
}

// Size the painting so the frame and the museum label always fit the window.
const wallEl = document.querySelector(".wall");
const narrow = matchMedia("(max-width: 920px)");
function fitArt() {
  if (narrow.matches) { document.documentElement.style.removeProperty("--art-max-h"); return; }
  if (!wallEl.clientHeight) return;
  const px = (node, prop) => parseFloat(getComputedStyle(node)[prop]) || 0;
  const frame = $("frame"), mat = $("mat");
  const label = Math.max(el.wallLabel.offsetHeight, el.wallLabel.scrollHeight) + px(el.wallLabel, "marginTop");
  const chrome = px(frame, "paddingTop") + px(frame, "paddingBottom") + px(mat, "paddingTop") + px(mat, "paddingBottom");
  const avail = wallEl.clientHeight - px(wallEl, "paddingTop") - px(wallEl, "paddingBottom") - label - chrome - 8;
  document.documentElement.style.setProperty("--art-max-h", Math.max(160, Math.floor(avail)) + "px");
}
let fitQueued = false;
addEventListener("resize", () => {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; if (screen === "game") fitArt(); });
});

function clueItem(c, revealed = false) {
  const li = document.createElement("li");
  if (c.items) {
    li.className = "look";
    li.innerHTML = `<div class="ct"></div><div class="cx"></div><ul class="hallmarks"></ul>`;
    li.querySelector(".ct").textContent = revealed ? c.revealTitle : c.title;
    li.querySelector(".cx").textContent = revealed ? c.revealIntro : c.intro;
    const ul = li.querySelector(".hallmarks");
    for (const h of c.items) {
      const item = document.createElement("li");
      item.innerHTML = `<span class="hs"></span><span class="ht"></span>${revealed ? `<q class="hq"></q>` : ""}<div class="cs">Source: <a target="_blank" rel="noopener"></a></div>`;
      item.querySelector(".hs").textContent = h.school ? h.school + ": " : "";
      item.querySelector(".ht").textContent = h.text;
      if (revealed) item.querySelector(".hq").textContent = h.quote;
      const a = item.querySelector("a");
      a.textContent = h.source.name;
      a.href = h.source.url;
      ul.appendChild(item);
    }
    return li;
  }
  li.innerHTML = `<div class="ct"></div><div class="cx"></div><div class="cs">Source: <a target="_blank" rel="noopener"></a></div>`;
  li.querySelector(".ct").textContent = c.title;
  li.querySelector(".cx").textContent = c.text;
  const a = li.querySelector("a");
  a.textContent = c.source.name;
  a.href = c.source.url;
  return li;
}

function updateClueButton() {
  const total = (game.round.clues || []).length;
  const left = total - game.shown;
  el.revealClue.classList.toggle("hidden", left <= 0);
  el.revealClue.textContent = game.shown === 0 ? `Reveal a clue (${left})` : `Another clue (${left} left)`;
}

function revealClue() {
  const clues = game.round.clues || [];
  if (game.shown >= clues.length || game.revealed) return;
  el.clueList.appendChild(clueItem(clues[game.shown]));
  game.shown += 1;
  updateClueButton();
}

function renderCenter() {
  if (screen !== "game") return;
  if (mode === "daily") {
    const st = dailyState() || { results: [] };
    let html = '<div class="squares" aria-label="Progress">';
    for (let i = 0; i < ROUNDS; i++) {
      const r = st.results[i];
      html += sqHTML(r ? r.tier : null, !r && i === game.index ? "current" : "");
    }
    el.center.innerHTML = html + "</div>";
  } else {
    const n = learn.history.length;
    el.center.innerHTML = `<span class="mode-label">Learn mode · <b>${n}</b> explored</span>`;
  }
}

function setupRound(round, index) {
  game.round = round;
  game.index = index;
  game.revealed = false;
  game.locking = false;
  game.shown = 0;

  el.guess.classList.remove("hidden");
  el.result.classList.add("hidden");
  el.ruler.classList.remove("revealed");
  el.slider.disabled = false;
  el.yearInput.readOnly = false;
  el.yearHint.classList.remove("hidden");
  el.keysHint.classList.remove("hidden");
  el.lock.classList.remove("hidden");
  el.lock.disabled = false;
  el.lock.innerHTML = `Lock in guess <kbd>Enter</kbd>`;
  setGuess(START_YEAR);

  el.roundLabel.textContent = mode === "daily" ? `Daily #${daily.puzzle} · painting ${index + 1} of ${ROUNDS}` : `Learn · painting ${learn.history.length + 1}`;
  el.clueArea.classList.toggle("hidden", mode !== "learn");
  if (mode === "learn") {
    el.clueList.innerHTML = "";
    el.noClues.classList.toggle("hidden", (round.clues || []).length > 0);
    updateClueButton();
  }
  renderLabel(null);
  fitArt();
  el.art.alt = "The painting to date. Its title and details are revealed after you guess.";
  loadArt(round.image);
  renderCenter();
  el.panel.scrollTop = 0;
  // keep keyboard play smooth: the timeline takes focus (the old Next button is now hidden)
  const ae = document.activeElement;
  if (!ae || ae === document.body || ae.offsetParent === null || el.result.contains(ae)) {
    el.slider.focus({ preventScroll: true });
  }
}

async function lockGuess() {
  if (game.revealed || game.locking || screen !== "game") return;
  commitYearInput();
  game.locking = true;
  el.lock.disabled = true;
  el.lock.textContent = "Revealing…";
  try {
    const data = mode === "daily" ? await fetchJSON(`/api/daily?reveal=${encodeURIComponent(game.round.token)}`) : game.round;
    showReveal(data);
  } catch (err) {
    toast(err.message || "Something went wrong. Try again.");
    el.lock.disabled = false;
    el.lock.innerHTML = `Lock in guess <kbd>Enter</kbd>`;
  } finally {
    game.locking = false;
  }
}

function showReveal(data) {
  const a = data.answer;
  const guess = game.guess;
  const s = scoreOf(guess, a);
  game.revealed = true;
  stopLoupe();

  // timeline
  el.slider.disabled = true;
  el.yearInput.readOnly = true;
  el.yearHint.classList.add("hidden");
  el.keysHint.classList.add("hidden");
  el.lock.classList.add("hidden");
  el.ruler.style.setProperty("--b0", pct(a.begin));
  el.ruler.style.setProperty("--bw", Math.max(0, pct(a.end) - pct(a.begin)));
  el.bandLabel.textContent = a.dated;
  el.pinLabel.textContent = `You: ${guess}`;
  el.ruler.classList.add("revealed");

  // result card
  el.tierChip.className = `tier-chip t-${s.tier}`;
  el.tierChip.textContent = s.tier === "perfect" ? "★" : "";
  el.resultOff.textContent = s.off === 0 ? "Spot on!" : `${fmt(s.off)} year${s.off === 1 ? "" : "s"} off`;
  el.resultSub.textContent = s.off === 0 ? `Inside the museum's date: ${a.dated}` : `Painted ${a.dated} · you guessed ${guess}`;
  if (mode === "daily") {
    el.resultPoints.classList.remove("hidden");
    el.resultPoints.innerHTML = `0<small>points</small>`;
    animateNumber(el.resultPoints, s.points, 900);
  } else {
    el.resultPoints.classList.add("hidden");
  }
  el.result.classList.remove("hidden");
  el.art.alt = `${a.title} by ${a.artist}, ${a.dated}`;
  el.clueArea.classList.add("hidden"); // all clues are shown again under "Why this date?"
  renderLabel(a);
  fitArt();

  // why this date
  const clues = data.clues || [];
  el.whyList.innerHTML = "";
  clues.forEach((c) => el.whyList.appendChild(clueItem(c, true)));
  el.note.classList.toggle("hidden", !data.note);
  if (data.note) {
    el.noteText.textContent = data.note.text;
    el.noteLink.href = data.note.source.url;
  }
  const hasWhy = clues.length > 0 || !!data.note;
  el.why.classList.toggle("hidden", !hasWhy);
  setWhyOpen(mode === "learn");

  // bookkeeping
  if (mode === "daily") {
    const st = dailyState() || { date: daily.date, puzzle: daily.puzzle, results: [], done: false };
    if (st.results.length === game.index) {
      st.results.push({ guess, off: s.off, points: s.points, tier: s.tier, thumb: data.thumb || game.round.image.thumb, answer: { title: a.title, artist: a.artist, dated: a.dated, culture: a.culture, url: a.url } });
      store.set("daily:" + daily.date, st);
    }
    el.next.innerHTML = game.index < ROUNDS - 1 ? `Next painting <kbd>Enter</kbd>` : `See your results <kbd>Enter</kbd>`;
  } else {
    const look = (data.clues || []).find((c) => c.items);
    learn.history.push({ thumb: data.image.thumb, answer: a, guess, off: s.off, tier: s.tier, tradition: look ? look.revealTitle.replace(/^Hallmarks of /, "") : a.culture || "Other" });
    el.next.innerHTML = `Next painting <kbd>Enter</kbd>`;
  }
  renderCenter();
  const sqs = el.center.querySelectorAll(".sq");
  if (mode === "daily" && sqs[game.index]) sqs[game.index].classList.add("pop");

  if (s.tier === "perfect") {
    requestAnimationFrame(() => {
      const r = el.tierChip.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, (a.palette || []).map((c) => c.hex).concat(["#f0c75e"]));
    });
  }
  el.next.focus({ preventScroll: true });
  el.panel.scrollTo({ top: 0, behavior: "smooth" });
}

function setWhyOpen(open) {
  el.why.classList.toggle("open", open);
  el.whyToggle.setAttribute("aria-expanded", String(open));
}

function commitYearInput() {
  const v = parseInt(el.yearInput.value, 10);
  if (Number.isFinite(v)) setGuess(v);
  else setGuess(game.guess);
}

function nextRound() {
  if (!game.revealed) return;
  if (mode === "daily") {
    const st = dailyState();
    if (st && st.results.length >= ROUNDS) return finishDaily();
    setupRound(daily.rounds[st.results.length], st.results.length);
  } else {
    nextLearn();
  }
}

// ---------------------------------------------------------------------------
// daily challenge
// ---------------------------------------------------------------------------
function startDaily() {
  if (!daily) return loadDaily();
  const st = dailyState();
  if (st && st.done) return showResults();
  mode = "daily";
  const index = st ? st.results.length : 0;
  if (index >= ROUNDS) return finishDaily();
  show("game");
  preload(daily.rounds.map((r) => r.image));
  setupRound(daily.rounds[index], index);
}

function finishDaily() {
  const st = dailyState();
  if (!st) return goHome();
  if (!st.done) {
    st.done = true;
    store.set("daily:" + daily.date, st);
    recordDaily(daily.date, st.results.reduce((a, r) => a + r.points, 0));
  }
  showResults();
}

function rankText(total) {
  if (total >= 4500) return "Curator-level eye.";
  if (total >= 3500) return "Excellent eye.";
  if (total >= 2500) return "A solid gallery wanderer.";
  if (total >= 1500) return "Getting there. The clues in Learn mode help.";
  return "Every museum visit sharpens the eye. Try Learn mode, then come back tomorrow.";
}

function shareText(st) {
  const total = st.results.reduce((a, r) => a + r.points, 0);
  return `Hindsight #${st.puzzle} · ${fmt(total)}/5,000\n${st.results.map((r) => TIER_EMOJI[r.tier]).join("")}\n${location.origin}`;
}

async function share(st) {
  const text = shareText(st);
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied! Paste it anywhere to share.");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(ok ? "Copied! Paste it anywhere to share." : "Couldn't copy automatically.");
  }
}

function statsHTML(highlight) {
  const s = getStats();
  const avg = s.played ? Math.round(s.total / s.played) : 0;
  const max = Math.max(1, ...s.dist);
  const labels = ["0–999", "1,000–1,999", "2,000–2,999", "3,000–3,999", "4,000–5,000"];
  const todayBucket = highlight !== undefined ? Math.min(4, Math.floor(highlight / 1000)) : -1;
  return `
    <div class="stat-grid">
      <div class="stat"><b>${s.played}</b><span>Played</span></div>
      <div class="stat"><b>${currentStreak(s)}</b><span>Streak</span></div>
      <div class="stat"><b>${s.maxStreak}</b><span>Best streak</span></div>
      <div class="stat"><b>${fmt(avg)}</b><span>Average</span></div>
    </div>
    <div class="dist" aria-label="Score distribution">
      ${labels.map((l, i) => `<div class="dist-row"><span>${l}</span><div class="dist-bar ${i === todayBucket ? "today" : ""}" style="width:${Math.max(8, (s.dist[i] / max) * 100)}%">${s.dist[i]}</div></div>`).join("")}
    </div>`;
}

function showResults() {
  const st = dailyState();
  if (!st) return goHome();
  mode = "daily";
  const total = st.results.reduce((a, r) => a + r.points, 0);
  show("results");
  el.results.innerHTML = `
    <div class="res-wrap">
      <div class="res-head">
        <p class="eyebrow">Hindsight #${st.puzzle} · ${prettyDate(st.date)}</p>
        <h2>Today's Five</h2>
        <div class="res-score"><span id="res-total">0</span><small> / 5,000</small></div>
        <p class="res-rank">${esc(rankText(total))}</p>
        <div class="res-squares">${st.results.map((r) => sqHTML(r.tier, "pop")).join("")}</div>
      </div>
      <div class="res-actions">
        <button class="btn primary" id="share-btn">Share your score</button>
        <button class="btn ghost" id="to-learn">Keep exploring in Learn mode</button>
      </div>
      <p class="res-next">Next puzzle in <b class="countdown" data-target="${daily ? daily.nextReset : 0}">${daily ? countdownText(daily.nextReset) : "--:--:--"}</b></p>
      <div class="card">
        <h3>Today's paintings</h3>
        <ol class="recap">
          ${st.results.map((r) => `
            <li>
              <img src="${esc(r.thumb)}" alt="" loading="lazy" />
              <div>
                <div class="rt">${esc(r.answer.title)}</div>
                <div class="rm">${esc(r.answer.artist)} · ${esc(r.answer.dated)}<br>You guessed ${r.guess} · ${r.off === 0 ? "spot on" : `${fmt(r.off)} yr off`}${r.answer.url ? ` · <a href="${esc(r.answer.url)}" target="_blank" rel="noopener">museum page ↗</a>` : ""}</div>
              </div>
              <div class="rr">${sqHTML(r.tier)}<span class="rp">${fmt(r.points)}</span></div>
            </li>`).join("")}
        </ol>
      </div>
      <div class="card"><h3>Your stats</h3>${statsHTML(total)}</div>
    </div>`;
  animateNumber($("res-total"), total, 1200);
  $("share-btn").addEventListener("click", () => share(st));
  $("to-learn").addEventListener("click", startLearn);
}

// ---------------------------------------------------------------------------
// endless learn mode
// ---------------------------------------------------------------------------
const learn = { queue: [], seen: new Set(), history: [], filling: null };

function fillQueue(min = 4) {
  if (learn.filling) return learn.filling;
  learn.filling = (async () => {
    let tries = 0;
    while (learn.queue.length < min && tries < 4) {
      tries += 1;
      const batch = 1 + Math.floor(Math.random() * 3000);
      const data = await fetchJSON(`/api/learn?batch=${batch}`);
      const fresh = data.rounds.filter((r) => !learn.seen.has(r.id));
      for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
      for (const r of fresh) { learn.seen.add(r.id); learn.queue.push(r); }
    }
  })().finally(() => { learn.filling = null; });
  return learn.filling;
}

async function startLearn() {
  mode = "learn";
  learn.queue = []; learn.history = [];
  show("game");
  el.art.classList.remove("loaded");
  el.artLoading.classList.remove("hidden");
  el.roundLabel.textContent = "Learn mode";
  renderLabel(null);
  renderCenter();
  try {
    await fillQueue();
    nextLearn();
  } catch (err) {
    toast(err.message || "Couldn't load paintings. Try again.");
    goHome();
  }
}

async function nextLearn() {
  if (!learn.queue.length) {
    el.artLoading.classList.remove("hidden");
    try { await fillQueue(); } catch (err) { toast(err.message); return goHome(); }
    if (!learn.queue.length) { toast("Couldn't find more paintings right now."); return endLearn(); }
  }
  const r = learn.queue.shift();
  setupRound(r, learn.history.length);
  preload(learn.queue.slice(0, 2).map((q) => q.image));
  if (learn.queue.length < 4) fillQueue().catch(() => {});
}

function endLearn() {
  if (!learn.history.length) return goHome();
  show("summary");
  const counts = {};
  for (const h of learn.history) counts[h.tradition] = (counts[h.tradition] || 0) + 1;
  const n = learn.history.length;
  const close = learn.history.filter((h) => h.tier === "perfect" || h.tier === "green").length;
  el.summary.innerHTML = `
    <div class="res-wrap">
      <div class="res-head">
        <p class="eyebrow">Learn session</p>
        <h2>You explored ${n} painting${n === 1 ? "" : "s"}</h2>
        <p class="res-rank">${close} within 25 years of the museum's date.</p>
      </div>
      <div class="res-actions">
        <button class="btn primary" id="learn-again">Keep exploring</button>
        <button class="btn ghost" id="learn-home">Back to the lobby</button>
      </div>
      <div class="card">
        <h3>Traditions you met</h3>
        <div class="chips">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, c]) => `<span class="chip">${esc(t)}<b>${c}</b></span>`).join("")}</div>
      </div>
      <div class="card">
        <h3>Your paintings</h3>
        <ol class="recap">
          ${learn.history.map((h) => `
            <li>
              <img src="${esc(h.thumb)}" alt="" loading="lazy" />
              <div>
                <div class="rt">${esc(h.answer.title)}</div>
                <div class="rm">${esc(h.answer.artist)} · ${esc(h.answer.dated)}<br>You guessed ${h.guess}${h.answer.url ? ` · <a href="${esc(h.answer.url)}" target="_blank" rel="noopener">museum page ↗</a>` : ""}</div>
              </div>
              <div class="rr">${sqHTML(h.tier)}<span class="rp" style="font-size:18px">${h.off === 0 ? "✓" : "±" + fmt(h.off)}</span></div>
            </li>`).join("")}
        </ol>
      </div>
    </div>`;
  $("learn-again").addEventListener("click", startLearn);
  $("learn-home").addEventListener("click", goHome);
}

// ---------------------------------------------------------------------------
// modals
// ---------------------------------------------------------------------------
function openModal(html) {
  el.modalBody.innerHTML = html;
  el.modal.classList.remove("hidden");
  el.modalX.focus({ preventScroll: true });
}
function closeModal() { el.modal.classList.add("hidden"); }
const modalOpen = () => !el.modal.classList.contains("hidden");

function helpHTML() {
  return `
    <h2 id="modal-title">How to play</h2>
    <p>Each painting comes from the Harvard Art Museums collection. Study it, zoom in, then drag the timeline (or type a year) to guess when it was made.</p>
    <h4>Daily challenge</h4>
    <ul>
      <li>Five paintings a day, the same for everyone. A new set arrives at midnight (US Eastern).</li>
      <li>One try per day. Up to 1,000 points per painting, 5,000 total.</li>
      <li>Landing inside the museum's date range is a perfect score.</li>
    </ul>
    <div class="legend" style="margin-top:12px">
      <div>${sqHTML("perfect")} Inside the museum's date range</div>
      <div>${sqHTML("green")} Within 25 years</div>
      <div>${sqHTML("yellow")} 26–75 years off</div>
      <div>${sqHTML("red")} More than 75 years off</div>
    </div>
    <h4>Learn mode</h4>
    <ul>
      <li>No score, no limit. Reveal clues from the museum's records and visual hallmarks quoted from museum sources, then see why each painting dates when it does.</li>
    </ul>
    <h4>Looking closely</h4>
    <ul>
      <li>Hover over a painting to magnify it. Click it (or press <kbd>Z</kbd>) for a full-resolution detail view.</li>
    </ul>
    <h4>Keyboard</h4>
    <div class="keys-table">
      <kbd>← →</kbd><span>Nudge your guess by a year (hold <kbd>Shift</kbd> for ten)</span>
      <kbd>Enter</kbd><span>Lock in guess / next painting</span>
      <kbd>Z</kbd><span>Open the detail view</span>
      <kbd>Esc</kbd><span>Close a window</span>
    </div>`;
}

function statsModalHTML() {
  const st = dailyState();
  return `
    <h2 id="modal-title">Your statistics</h2>
    <p class="fine" style="margin-bottom:16px">Saved in this browser.</p>
    ${statsHTML(st && st.done ? st.results.reduce((a, r) => a + r.points, 0) : undefined)}
    ${daily ? `<p class="res-next" style="margin-top:18px">Next daily puzzle in <b class="countdown" data-target="${daily.nextReset}">${countdownText(daily.nextReset)}</b></p>` : ""}`;
}

// ---------------------------------------------------------------------------
// navigation & events
// ---------------------------------------------------------------------------
function goHome() {
  closeZoom();
  mode = null;
  show("home");
  renderHome();
}

function tick() {
  for (const node of document.querySelectorAll(".countdown[data-target]")) {
    const target = Number(node.dataset.target);
    if (target) node.textContent = countdownText(target);
  }
  if (daily && Date.now() >= daily.nextReset && screen !== "game") {
    daily = null;
    loadDaily(); // a new day: fetch the new puzzle
  }
}

function onKey(e) {
  if (modalOpen()) {
    if (e.key === "Escape") closeModal();
    return;
  }
  if (isZoomOpen()) {
    if (e.key === "Escape") closeZoom();
    else if (e.key === "+" || e.key === "=") zoomBy("in");
    else if (e.key === "-" || e.key === "_") zoomBy("out");
    else if (e.key === "0") zoomBy("home");
    return;
  }
  const typing = e.target === el.yearInput;
  if (e.key === "?" && !typing) { openModal(helpHTML()); return; }
  if (screen !== "game") return;

  if ((e.key === "z" || e.key === "Z") && !typing && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    openZoom(game.round && game.round.image);
    return;
  }
  if (e.key === "Enter") {
    if (typing) { e.preventDefault(); lockGuess(); return; }
    const ctl = e.target.closest && e.target.closest("button, a");
    if (ctl && ctl.offsetParent !== null) return; // let a visible focused control handle it
    e.preventDefault();
    game.revealed ? nextRound() : lockGuess();
    return;
  }
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !typing && !game.revealed) {
    e.preventDefault();
    const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowLeft" ? -1 : 1);
    setGuess(game.guess + step);
  }
}

function bind() {
  el.dailyCard.addEventListener("click", startDaily);
  el.learnCard.addEventListener("click", startLearn);
  $("home-btn").addEventListener("click", () => {
    if (screen === "game" && mode === "learn" && learn.history.length) return endLearn();
    goHome();
  });
  el.endLearn.addEventListener("click", endLearn);
  $("help-btn").addEventListener("click", () => openModal(helpHTML()));
  $("stats-btn").addEventListener("click", () => openModal(statsModalHTML()));
  el.modalX.addEventListener("click", closeModal);
  el.modal.addEventListener("click", (e) => { if (e.target === el.modal) closeModal(); });

  el.slider.addEventListener("input", () => setGuess(el.slider.value));
  el.yearInput.addEventListener("focus", () => el.yearInput.select());
  el.yearInput.addEventListener("input", () => {
    const digits = el.yearInput.value.replace(/\D/g, "").slice(0, 4);
    if (digits !== el.yearInput.value) el.yearInput.value = digits;
    const v = parseInt(digits, 10);
    if (digits.length === 4 && v >= MIN_YEAR && v <= MAX_YEAR) setGuess(v, { keepInput: true });
  });
  el.yearInput.addEventListener("blur", () => { if (!game.revealed) commitYearInput(); });
  el.lock.addEventListener("click", lockGuess);
  el.next.addEventListener("click", nextRound);
  // After a mouse click (detail > 0), hand focus back so Enter keeps meaning "lock in" / "next".
  // Keyboard users who tabbed to these buttons keep normal button behavior.
  el.revealClue.addEventListener("click", (e) => {
    revealClue();
    if (e.detail > 0) el.slider.focus({ preventScroll: true });
  });
  el.whyToggle.addEventListener("click", (e) => {
    setWhyOpen(!el.why.classList.contains("open"));
    if (e.detail > 0) el.next.focus({ preventScroll: true });
  });
  el.zoomBtn.addEventListener("click", () => openZoom(game.round && game.round.image));
  el.art.addEventListener("click", () => openZoom(game.round && game.round.image));
  el.artRetry.addEventListener("click", () => game.round && loadArt(game.round.image));
  document.addEventListener("keydown", onKey);
  setInterval(tick, 1000);
}

async function loadSalon() {
  try {
    const data = await fetchJSON("/api/learn?batch=7");
    buildSalon(data.rounds.map((r) => r.image.thumb));
  } catch { /* decorative only */ }
}

function init() {
  initFx();
  initZoom();
  buildTicks();
  setGuess(START_YEAR);
  bind();
  renderHome();
  loadDaily();
  loadSalon();
  if (!store.get("seen-help", false)) {
    store.set("seen-help", true);
    setTimeout(() => { if (screen === "home" && !modalOpen()) openModal(helpHTML()); }, 900);
  }
}

init();
