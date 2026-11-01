// Deep-zoom viewer. Uses OpenSeadragon (loaded on first use) with the museum's IIIF
// image service, so players can zoom all the way into brushstrokes and gold leaf.
// Falls back to a very large single image if the IIIF service can't be reached.

import { stopLoupe } from "./fx.js";

const OSD_URL = "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/openseadragon.min.js";
const zoomEl = document.getElementById("zoom");
const loadingEl = document.getElementById("zoom-loading");
let viewer = null;
let osdPromise = null;
let current = null; // image info currently shown
let lastFocus = null;

function loadOSD() {
  if (window.OpenSeadragon) return Promise.resolve(window.OpenSeadragon);
  if (!osdPromise) {
    osdPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = OSD_URL;
      s.onload = () => resolve(window.OpenSeadragon);
      s.onerror = () => { osdPromise = null; reject(new Error("Could not load the zoom viewer.")); };
      document.head.appendChild(s);
    });
  }
  return osdPromise;
}

function setLoading(on, text) {
  loadingEl.classList.toggle("done", !on);
  if (text) loadingEl.lastChild.textContent = text;
}

export function isZoomOpen() {
  return !zoomEl.classList.contains("hidden");
}

// The museum's image URLs redirect to ids.lib.harvard.edu/mps/<id>, and its IIIF service
// accepts the same id. When the record didn't include a IIIF address, find it that way.
async function iiifFor(image) {
  if (image.iiif) return image.iiif.replace(/\/$/, "");
  if (image._iiif !== undefined) return image._iiif;
  let found = null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const res = await fetch(image.thumb || image.src, { method: "HEAD", mode: "cors", signal: ctl.signal });
    const m = res.url.match(/\/(?:mps|ids\/view)\/(\d+)/);
    if (m) found = `https://ids.lib.harvard.edu/ids/iiif/${m[1]}`;
  } catch { /* use the single large image instead */ }
  clearTimeout(timer);
  image._iiif = found;
  return found;
}

let openJob = 0;

export async function openZoom(image) {
  if (!image) return;
  const job = ++openJob;
  lastFocus = document.activeElement;
  stopLoupe();
  document.body.classList.add("zoom-open");
  zoomEl.classList.remove("hidden");
  setLoading(true, "Loading full-resolution image…");
  zoomEl.querySelector(".zoom-close").focus({ preventScroll: true });
  try {
    const OSD = await loadOSD();
    if (!viewer) {
      viewer = OSD({
        element: document.getElementById("osd"),
        showNavigationControl: false,
        showNavigator: true,
        navigatorPosition: "BOTTOM_RIGHT",
        navigatorSizeRatio: 0.16,
        animationTime: 0.7,
        springStiffness: 8,
        blendTime: 0.15,
        maxZoomPixelRatio: 2.5,
        visibilityRatio: 0.6,
        minZoomImageRatio: 0.8,
        constrainDuringPan: true,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: true, flickEnabled: true },
        crossOriginPolicy: "Anonymous",
        imageLoaderLimit: 6,
        viewportMargins: { top: 84, bottom: 96, left: 24, right: 24 },
      });
      viewer.addHandler("tile-loaded", () => setLoading(false));
      viewer.addHandler("open", () => setTimeout(() => setLoading(false), 4000));
      viewer.addHandler("open-failed", () => {
        if (current && !current._fellBack) {
          current._fellBack = true;
          viewer.open({ type: "image", url: current.hires, buildPyramid: false });
        } else {
          setLoading(true, "Sorry, this image couldn't be loaded in detail view.");
        }
      });
    }
    const iiif = await iiifFor(image);
    if (job !== openJob || !isZoomOpen()) return; // closed or replaced while we were looking
    current = { ...image, _fellBack: !iiif };
    const source = iiif ? `${iiif}/info.json` : { type: "image", url: image.hires, buildPyramid: false };
    viewer.open(source);
  } catch (err) {
    setLoading(true, err.message);
  }
}

export function closeZoom() {
  if (!isZoomOpen()) return;
  zoomEl.classList.add("hidden");
  document.body.classList.remove("zoom-open");
  if (viewer) viewer.close();
  current = null;
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

export function zoomBy(kind) {
  if (!viewer || !viewer.viewport) return;
  if (kind === "in") viewer.viewport.zoomBy(1.6);
  if (kind === "out") viewer.viewport.zoomBy(1 / 1.6);
  if (kind === "home") viewer.viewport.goHome();
  viewer.viewport.applyConstraints();
}

export function initZoom() {
  zoomEl.querySelector(".zoom-bar").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.z === "close") closeZoom();
    else zoomBy(b.dataset.z);
  });
}
