// Frontend game logic. Note: there is NO API key in here.
// The browser only ever talks to our own /api/artworks endpoint.

const MIN_YEAR = 1300;
const MAX_YEAR = 2020;

const $ = (id) => document.getElementById(id);
const els = {
  intro: $("intro"), game: $("game"), summary: $("summary"), error: $("error"),
  round: $("round"), score: $("score"),
  art: $("art"), loader: $("loader"),
  guessing: $("guessing"), reveal: $("reveal"),
  slider: $("slider"), guessYear: $("guess-year"), lock: $("lock"),
  pts: $("pts"), verdict: $("verdict"),
  tlRange: $("tl-range"), tlGuess: $("tl-guess"),
  title: $("title"), meta: $("meta"), palette: $("palette"), link: $("link"),
  next: $("next"), final: $("final"), rank: $("rank"), recap: $("recap"),
  start: $("start"), startLearn: $("start-learn"), again: $("again"), switchMode: $("switch"),
  scoreBox: $("score-box"), finalLine: $("final-line"),
  clueArea: $("clue-area"), clueList: $("clue-list"), revealClue: $("reveal-clue"), noClues: $("no-clues"),
  why: $("why"), whyList: $("why-list"),
  note: $("museum-note"), noteText: $("museum-note-text"), noteLink: $("museum-note-link"),
};

let state = { rounds: [], i: 0, total: 0, results: [], mode: "play", shown: 0 };

function show(screen) {
  for (const s of [els.intro, els.game, els.summary]) s.classList.toggle("hidden", s !== screen);
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.classList.remove("hidden");
}

const buttons = () => [els.start, els.startLearn, els.again, els.switchMode];

async function startGame(mode) {
  els.error.classList.add("hidden");
  buttons().forEach((b) => (b.disabled = true));
  els.again.textContent = "Loading…";
  try {
    const res = await fetch(mode === "learn" ? "/api/artworks?mode=learn" : "/api/artworks");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    state = { rounds: data.rounds, i: 0, total: 0, results: [], mode, shown: 0 };
    document.body.dataset.mode = mode;
    els.scoreBox.classList.toggle("hidden", mode === "learn");
    // warm the browser cache so later rounds appear instantly
    data.rounds.forEach((r) => { new Image().src = r.image; });
    els.score.textContent = "0";
    show(els.game);
    loadRound();
  } catch (err) {
    show(els.intro);
    showError(err.message);
  } finally {
    buttons().forEach((b) => (b.disabled = false));
    els.again.textContent = state.mode === "learn" ? "Learn again" : "Play again";
  }
}

function loadRound() {
  const r = state.rounds[state.i];
  els.round.textContent = `${state.i + 1} / ${state.rounds.length}`;
  els.guessing.classList.remove("hidden");
  els.reveal.classList.add("hidden");
  els.slider.value = 1650;
  els.guessYear.textContent = "1650";

  els.art.classList.remove("loaded");
  els.loader.classList.remove("hidden");
  els.art.onload = () => { els.art.classList.add("loaded"); els.loader.classList.add("hidden"); };
  els.art.onerror = () => { els.loader.classList.add("hidden"); };
  els.art.src = r.image;

  // Learn mode: clues start hidden and are revealed one at a time
  const learn = state.mode === "learn";
  els.clueArea.classList.toggle("hidden", !learn);
  if (learn) {
    state.shown = 0;
    els.clueList.innerHTML = "";
    els.noClues.classList.toggle("hidden", (r.clues || []).length > 0);
    updateClueButton();
  }
}

function clueItem(c, revealed = false) {
  const li = document.createElement("li");
  if (c.items) {
    // "What to look for": a list of sourced visual hallmarks
    li.className = "look";
    li.innerHTML = `<div class="ct"></div><div class="cx"></div><ul class="hallmarks"></ul>`;
    li.querySelector(".ct").textContent = revealed ? c.revealTitle : c.title;
    li.querySelector(".cx").textContent = revealed ? c.revealIntro : c.intro;
    const ul = li.querySelector(".hallmarks");
    c.items.forEach((h) => {
      const item = document.createElement("li");
      item.innerHTML = `<span class="hs"></span><span class="ht"></span>` +
        (revealed ? `<q class="hq"></q>` : "") +
        `<div class="cs">Source: <a target="_blank" rel="noopener"></a></div>`;
      item.querySelector(".hs").textContent = h.school ? h.school + ": " : "";
      item.querySelector(".ht").textContent = h.text;
      if (revealed) item.querySelector(".hq").textContent = h.quote;
      const a = item.querySelector("a");
      a.textContent = h.source.name;
      a.href = h.source.url;
      ul.appendChild(item);
    });
    return li;
  }
  li.innerHTML = `<div class="ct"></div><div class="cx"></div><div class="cs">Source: <a target="_blank" rel="noopener"></a></div>`;
  li.querySelector(".ct").textContent = c.title;
  li.querySelector(".cx").textContent = c.text;
  const a = li.querySelector(".cs a");
  a.textContent = c.source.name;
  a.href = c.source.url;
  return li;
}

function updateClueButton() {
  const total = (state.rounds[state.i].clues || []).length;
  const left = total - state.shown;
  els.revealClue.classList.toggle("hidden", left <= 0);
  els.revealClue.textContent = state.shown === 0 ? `Reveal a clue (${left})` : `Another clue (${left} left)`;
}

function revealClue() {
  const clues = state.rounds[state.i].clues || [];
  if (state.shown >= clues.length) return;
  els.clueList.appendChild(clueItem(clues[state.shown]));
  state.shown++;
  updateClueButton();
}

function scoreFor(guess, r) {
  const off = guess < r.begin ? r.begin - guess : guess > r.end ? guess - r.end : 0;
  return { off, points: Math.round(1000 * Math.exp(-off / 75)) };
}

function verdictText(off) {
  if (off === 0) return "Spot on. Right inside the museum's date range.";
  if (off <= 10) return `Only ${off} year${off === 1 ? "" : "s"} off. Excellent eye.`;
  if (off <= 40) return `${off} years off. Close!`;
  if (off <= 120) return `${off} years off. Right era-ish.`;
  return `${off} years off. Time travel is hard.`;
}

const pct = (y) => ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

function lockGuess() {
  const r = state.rounds[state.i];
  const guess = Number(els.slider.value);
  const { off, points } = scoreFor(guess, r);

  state.total += points;
  state.results.push({ r, guess, points, off });
  els.score.textContent = state.total.toLocaleString();

  const learn = state.mode === "learn";
  els.pts.parentElement.classList.toggle("hidden", learn);
  els.pts.textContent = points.toLocaleString();

  // "Why this date?" — every sourced clue, plus the curator's note if there is one
  els.why.classList.toggle("hidden", !learn);
  if (learn) {
    els.whyList.innerHTML = "";
    (r.clues || []).forEach((c) => els.whyList.appendChild(clueItem(c, true)));
    els.note.classList.toggle("hidden", !r.note);
    if (r.note) {
      els.noteText.textContent = r.note.text;
      els.noteLink.href = r.note.source.url;
    }
  }
  els.verdict.textContent = verdictText(off);

  els.tlRange.style.left = `${pct(r.begin)}%`;
  els.tlRange.style.width = `${Math.max(pct(r.end) - pct(r.begin), 0)}%`;
  els.tlRange.dataset.label = r.begin === r.end ? `Actual: ${r.begin}` : `Actual: ${r.begin}–${r.end}`;
  els.tlGuess.style.left = `${pct(guess)}%`;
  els.tlGuess.querySelector("span").textContent = `You: ${guess}`;

  els.title.textContent = r.title;
  els.meta.textContent = [r.artist, r.dated, r.culture, r.medium].filter(Boolean).join(" · ");
  els.link.href = r.url;

  els.palette.innerHTML = "";
  const sum = r.palette.reduce((a, c) => a + c.percent, 0) || 1;
  r.palette.forEach((c) => {
    const d = document.createElement("div");
    d.style.background = c.hex;
    d.style.flex = String(c.percent / sum);
    d.dataset.hex = c.hex;
    d.title = `${c.hex} · ${Math.round(c.percent * 100)}%`;
    els.palette.appendChild(d);
  });
  els.palette.parentElement.querySelector(".palette-note").classList.toggle("hidden", !r.palette.length);
  els.palette.classList.toggle("hidden", !r.palette.length);

  els.next.textContent = state.i === state.rounds.length - 1 ? "See results" : "Next";
  els.guessing.classList.add("hidden");
  els.reveal.classList.remove("hidden");
}

function nextRound() {
  state.i++;
  if (state.i < state.rounds.length) return loadRound();
  finish();
}

function finish() {
  const learn = state.mode === "learn";
  const max = state.rounds.length * 1000;
  if (learn) {
    const avg = Math.round(state.results.reduce((a, x) => a + x.off, 0) / state.results.length);
    els.finalLine.innerHTML = "";
    els.finalLine.append(`On average you were ${avg} year${avg === 1 ? "" : "s"} off`);
  } else {
    els.finalLine.innerHTML = 'Final score: <span id="final"></span><small></small>';
    els.final = $("final");
    els.final.textContent = state.total.toLocaleString();
    els.final.nextElementSibling.textContent = ` / ${max.toLocaleString()}`;
  }
  const ratio = state.total / max;
  els.rank.textContent = learn
    ? "Try a scored round and see how much the clues stuck."
    : ratio > 0.8 ? "Curator material. Harvard should hire you." :
    ratio > 0.55 ? "Art history TA energy." :
    ratio > 0.3 ? "A solid gallery wanderer." :
    "Every visit to the museum makes you better. Go again!";

  els.recap.innerHTML = "";
  state.results.forEach(({ r, guess, points, off }) => {
    const li = document.createElement("li");
    li.innerHTML = `<img alt="" /><div><div class="t"></div><div class="d"></div></div><div class="p"></div>`;
    li.querySelector("img").src = r.image;
    li.querySelector(".t").textContent = r.title;
    li.querySelector(".d").textContent = `${r.dated} · you guessed ${guess}`;
    li.querySelector(".p").textContent = learn ? (off === 0 ? "✓" : `±${off}`) : points;
    els.recap.appendChild(li);
  });
  els.round.textContent = "–";
  els.switchMode.textContent = learn ? "Play for points" : "Try Learn mode";
  els.again.textContent = learn ? "Learn again" : "Play again";
  show(els.summary);
}

els.slider.addEventListener("input", () => { els.guessYear.textContent = els.slider.value; });
els.start.addEventListener("click", () => startGame("play"));
els.startLearn.addEventListener("click", () => startGame("learn"));
els.again.addEventListener("click", () => startGame(state.mode));
els.switchMode.addEventListener("click", () => startGame(state.mode === "learn" ? "play" : "learn"));
els.revealClue.addEventListener("click", revealClue);
els.lock.addEventListener("click", lockGuess);
els.next.addEventListener("click", nextRound);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.target.tagName === "A") return;
  if (els.game.classList.contains("hidden")) return;
  e.preventDefault(); // stops a focused button from also firing its own click
  if (!els.guessing.classList.contains("hidden")) lockGuess();
  else nextRound();
});
