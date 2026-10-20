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
  start: $("start"), again: $("again"),
};

let state = { rounds: [], i: 0, total: 0, results: [] };

function show(screen) {
  for (const s of [els.intro, els.game, els.summary]) s.classList.toggle("hidden", s !== screen);
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.classList.remove("hidden");
}

async function startGame() {
  els.error.classList.add("hidden");
  els.start.disabled = els.again.disabled = true;
  els.start.textContent = els.again.textContent = "Loading…";
  try {
    const res = await fetch("/api/artworks");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    state = { rounds: data.rounds, i: 0, total: 0, results: [] };
    // warm the browser cache so later rounds appear instantly
    data.rounds.forEach((r) => { new Image().src = r.image; });
    els.score.textContent = "0";
    show(els.game);
    loadRound();
  } catch (err) {
    show(els.intro);
    showError(err.message);
  } finally {
    els.start.disabled = els.again.disabled = false;
    els.start.textContent = "Start";
    els.again.textContent = "Play again";
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
  state.results.push({ r, guess, points });
  els.score.textContent = state.total.toLocaleString();

  els.pts.textContent = points.toLocaleString();
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
  const max = state.rounds.length * 1000;
  els.final.textContent = state.total.toLocaleString();
  els.final.nextElementSibling.textContent = ` / ${max.toLocaleString()}`;
  const ratio = state.total / max;
  els.rank.textContent =
    ratio > 0.8 ? "Curator material. Harvard should hire you." :
    ratio > 0.55 ? "Art history TA energy." :
    ratio > 0.3 ? "A solid gallery wanderer." :
    "Every visit to the museum makes you better. Go again!";

  els.recap.innerHTML = "";
  state.results.forEach(({ r, guess, points }) => {
    const li = document.createElement("li");
    li.innerHTML = `<img alt="" /><div><div class="t"></div><div class="d"></div></div><div class="p"></div>`;
    li.querySelector("img").src = r.image;
    li.querySelector(".t").textContent = r.title;
    li.querySelector(".d").textContent = `${r.dated} · you guessed ${guess}`;
    li.querySelector(".p").textContent = points;
    els.recap.appendChild(li);
  });
  els.round.textContent = "–";
  show(els.summary);
}

els.slider.addEventListener("input", () => { els.guessYear.textContent = els.slider.value; });
els.start.addEventListener("click", startGame);
els.again.addEventListener("click", startGame);
els.lock.addEventListener("click", lockGuess);
els.next.addEventListener("click", nextRound);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.target.tagName === "A") return;
  if (els.game.classList.contains("hidden")) return;
  e.preventDefault(); // stops a focused button from also firing its own click
  if (!els.guessing.classList.contains("hidden")) lockGuess();
  else nextRound();
});
