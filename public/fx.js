// Visual effects: gallery spotlight, drifting dust, custom cursor, magnifying loupe,
// paint-splash burst, and the floating "salon" of paintings on the home screen.
// Everything here is decorative and switches itself off for touch devices and for
// people who prefer reduced motion.

const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const body = document.body;

const mouse = { x: innerWidth / 2, y: innerHeight * 0.35, seen: false };
const light = { x: mouse.x, y: mouse.y };

// ---------------------------------------------------------------------------
// Spotlight + dust (one animation loop)
// ---------------------------------------------------------------------------
const dust = document.getElementById("dust");
const dctx = dust.getContext("2d");
let motes = [];
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  for (const c of [dust, burstCanvas]) {
    c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
  }
  dctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const target = reducedMotion ? 0 : Math.min(110, Math.round((W * H) / 16000));
  while (motes.length < target) motes.push(newMote(true));
  motes.length = target;
}

function newMote(anywhere) {
  return {
    x: Math.random() * W,
    y: anywhere ? Math.random() * H : H + 10,
    r: 0.4 + Math.random() * 1.5,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -0.04 - Math.random() * 0.14,
    ph: Math.random() * Math.PI * 2,
  };
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(50, now - last) / 16.67;
  last = now;
  // spotlight follows the mouse lazily
  light.x += (mouse.x - light.x) * 0.06 * dt;
  light.y += (mouse.y - light.y) * 0.06 * dt;
  root.style.setProperty("--mx", light.x.toFixed(1) + "px");
  root.style.setProperty("--my", light.y.toFixed(1) + "px");

  // dust
  dctx.clearRect(0, 0, W, H);
  for (const m of motes) {
    m.ph += 0.01 * dt;
    m.x += (m.vx + Math.sin(m.ph) * 0.05) * dt;
    m.y += m.vy * dt;
    if (m.y < -10 || m.x < -10 || m.x > W + 10) Object.assign(m, newMote(false));
    const d = Math.hypot(m.x - light.x, m.y - light.y);
    const glow = Math.max(0, 1 - d / 380);
    const a = 0.06 + glow * 0.55;
    dctx.beginPath();
    dctx.fillStyle = `rgba(255, 226, 170, ${a.toFixed(3)})`;
    dctx.arc(m.x, m.y, m.r * (1 + glow * 0.6), 0, Math.PI * 2);
    dctx.fill();
  }

  // cursor ring trails the dot
  ring.x += (mouse.x - ring.x) * 0.22 * dt;
  ring.y += (mouse.y - ring.y) * 0.22 * dt;
  ringEl.style.transform = `translate3d(${ring.x.toFixed(1)}px, ${ring.y.toFixed(1)}px, 0)`;

  stepBurst(dt);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Custom cursor + loupe
// ---------------------------------------------------------------------------
const dotEl = document.getElementById("cursor-dot");
const ringEl = document.getElementById("cursor-ring");
const loupeEl = document.getElementById("loupe");
const ring = { x: mouse.x, y: mouse.y };
const LOUPE_ZOOM = 3;
let loupeTarget = null; // the <img> currently under the loupe
let loupeHires = null; // { for: src, url, ready }

const INTERACTIVE = "a, button, summary, [role='button'], .mode-card, label";

function onMove(e) {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (!mouse.seen) { mouse.seen = true; ring.x = mouse.x; ring.y = mouse.y; }
  body.classList.remove("cursor-out");
  dotEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
  if (loupeTarget) positionLoupe();
  else if (finePointer && e.target && e.target.id === "art" && e.target.classList.contains("loaded") && !body.classList.contains("zoom-open")) startLoupe(e.target);
  // hover glow on mode cards
  const card = e.target.closest && e.target.closest(".mode-card");
  if (card) {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--cx", `${e.clientX - r.left}px`);
    card.style.setProperty("--cy", `${e.clientY - r.top}px`);
  }
}

function onOver(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const textInput = t.closest("input[type='text'], textarea");
  body.classList.toggle("cursor-native", !!textInput);
  ringEl.classList.toggle("grab", !!t.closest(".slider, .osd"));
  ringEl.classList.toggle("hover", !textInput && !t.closest(".slider, .osd") && !!t.closest(INTERACTIVE));
  const img = t.closest("#art");
  if (img && img.classList.contains("loaded") && !body.classList.contains("zoom-open")) startLoupe(img);
  else if (!img) stopLoupe();
}

function startLoupe(img) {
  loupeTarget = img;
  body.classList.add("cursor-loupe");
  const hires = img.dataset.hires;
  if (hires && (!loupeHires || loupeHires.for !== img.currentSrc)) {
    loupeHires = { for: img.currentSrc, url: img.currentSrc, ready: false };
    const pre = new Image();
    const job = loupeHires;
    pre.onload = () => { if (loupeHires === job) { job.url = hires; job.ready = true; if (loupeTarget) positionLoupe(); } };
    pre.src = hires;
  }
  positionLoupe();
}

export function stopLoupe() {
  loupeTarget = null;
  body.classList.remove("cursor-loupe");
}

function positionLoupe() {
  const img = loupeTarget;
  const r = img.getBoundingClientRect();
  if (mouse.x < r.left || mouse.x > r.right || mouse.y < r.top || mouse.y > r.bottom) return stopLoupe();
  const size = loupeEl.offsetWidth || 210;
  const bw = r.width * LOUPE_ZOOM, bh = r.height * LOUPE_ZOOM;
  const fx = (mouse.x - r.left) / r.width, fy = (mouse.y - r.top) / r.height;
  const url = (loupeHires && loupeHires.url) || img.currentSrc;
  loupeEl.style.backgroundImage = `url("${url}")`;
  loupeEl.style.backgroundSize = `${bw}px ${bh}px`;
  loupeEl.style.backgroundPosition = `${size / 2 - fx * bw}px ${size / 2 - fy * bh}px`;
  loupeEl.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
}

// ---------------------------------------------------------------------------
// Paint-splash burst (for perfect guesses)
// ---------------------------------------------------------------------------
const burstCanvas = document.getElementById("burst");
const bctx = burstCanvas.getContext("2d");
let splats = [];

export function burst(x, y, colors = ["#f0c75e", "#e9cf8a", "#d9b46a"]) {
  if (reducedMotion) return;
  const palette = colors.length ? colors : ["#f0c75e"];
  for (let i = 0; i < 70; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 2 + Math.random() * 7;
    splats.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3,
      r: 2 + Math.random() * 5, life: 1, decay: 0.012 + Math.random() * 0.015,
      c: palette[i % palette.length], rot: Math.random() * 6, squash: 0.5 + Math.random() * 0.5,
    });
  }
}

function stepBurst(dt) {
  if (!splats.length) return;
  bctx.clearRect(0, 0, W, H);
  for (const s of splats) {
    s.vy += 0.22 * dt;
    s.vx *= 0.985;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.life -= s.decay * dt;
    bctx.globalAlpha = Math.max(0, s.life);
    bctx.fillStyle = s.c;
    bctx.beginPath();
    bctx.ellipse(s.x, s.y, s.r, s.r * s.squash, s.rot, 0, Math.PI * 2);
    bctx.fill();
  }
  bctx.globalAlpha = 1;
  splats = splats.filter((s) => s.life > 0 && s.y < H + 40);
  if (!splats.length) bctx.clearRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------
// Salon wall: dim framed paintings drifting around the edges of the home screen
// ---------------------------------------------------------------------------
const SLOTS = [
  { x: 3, y: 12, h: 22, d: 1.2, rot: -2 }, { x: 10, y: 52, h: 26, d: 0.7, rot: 1.5 }, { x: 2, y: 80, h: 16, d: 1.6, rot: -1 },
  { x: 84, y: 9, h: 20, d: 1.4, rot: 2 }, { x: 88, y: 44, h: 28, d: 0.8, rot: -1.5 }, { x: 80, y: 78, h: 18, d: 1.3, rot: 1 },
  { x: 22, y: 6, h: 13, d: 1.9, rot: 1 }, { x: 68, y: 4, h: 14, d: 1.7, rot: -2 }, { x: 24, y: 84, h: 14, d: 1.5, rot: -1 },
  { x: 66, y: 86, h: 13, d: 1.8, rot: 2 },
];
const salonEl = document.getElementById("salon");
let salonItems = [];

export function buildSalon(images) {
  if (!images || !images.length || salonItems.length) return;
  const useable = images.slice(0, SLOTS.length);
  let loaded = 0;
  useable.forEach((src, i) => {
    const s = SLOTS[i];
    const item = document.createElement("div");
    item.className = "salon-item";
    item.style.left = s.x + "vw";
    item.style.top = s.y + "vh";
    item.style.height = `min(${s.h}vh, ${s.h * 1.1}vw)`;
    item.style.setProperty("--rot", s.rot + "deg");
    item.innerHTML = `<div class="salon-frame" style="height:100%;--dur:${10 + i * 1.7}s"><img alt="" /></div>`;
    const img = item.querySelector("img");
    img.onload = () => { if (++loaded >= Math.min(4, useable.length)) salonEl.classList.add("ready"); };
    img.onerror = () => item.remove();
    img.src = src;
    salonEl.appendChild(item);
    salonItems.push({ el: item, depth: s.d });
  });
}

function parallax() {
  const nx = mouse.x / W - 0.5, ny = mouse.y / H - 0.5;
  for (const it of salonItems) {
    it.el.style.setProperty("--px", `${(-nx * 26 * it.depth).toFixed(1)}px`);
    it.el.style.setProperty("--py", `${(-ny * 20 * it.depth).toFixed(1)}px`);
  }
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
export function initFx() {
  resize();
  addEventListener("resize", resize);
  addEventListener("mousemove", (e) => { onMove(e); if (salonItems.length && !reducedMotion) parallax(); }, { passive: true });
  if (finePointer) {
    body.classList.add("fx-cursor");
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseleave", () => { body.classList.add("cursor-out"); stopLoupe(); });
    document.addEventListener("mousedown", () => ringEl.classList.add("down"));
    document.addEventListener("mouseup", () => ringEl.classList.remove("down"));
    addEventListener("blur", () => body.classList.add("cursor-out"));
    addEventListener("scroll", () => { if (loupeTarget) positionLoupe(); }, { passive: true });
  }
  requestAnimationFrame(frame);
}
