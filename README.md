# Hindsight: a daily art-dating game

### ▶ Play it live: **<https://harvard-hindsight.vercel.app>**

Hindsight shows you a painting from the Harvard Art Museums collection with the title, artist,
and date hidden. You study it (with a magnifier and a full-resolution zoom), drag a timeline to
the year you think it was made, and then see the museum's real label and an explanation of why
the painting dates when it does.

There are two ways to play:

- **Daily challenge:** five paintings a day, the same five for everyone, one try. A new puzzle
  arrives at midnight US Eastern. You get up to 1,000 points per painting, a shareable emoji
  result, and a streak and stats saved in your browser.
- **Learn mode:** endless, no score. Reveal sourced clues and visual "what to look for"
  hallmarks before you guess, then read the full explanation afterward.

---

## Background

### The collection and the API

The [Harvard Art Museums](https://harvardartmuseums.org) are three museums in one building: the
Fogg Museum, the Busch-Reisinger Museum, and the Arthur M. Sackler Museum. Together they hold
paintings from medieval Europe to the present, along with major collections of Chinese,
Japanese, and Korean art. The museums publish their collection data through a free public
[REST API](https://github.com/harvardartmuseums/api-docs) (an API key is required). Every
painting, label, date, and image in this game comes live from that API.

### Why a dating game?

Telling roughly when a painting was made by looking at it is a core skill in art history.
Curators and conservators read clues such as the materials (egg tempera on a wooden panel vs.
oil on canvas vs. acrylic), the conventions of a tradition (gold-leaf backgrounds in 1300s Italy,
screens of oversized figures set against gold foil in Momoyama-period Japan), the subject matter,
and what was technically possible at the time. Most museum visitors never practice this. Hindsight turns it into a game: the
daily challenge (inspired by daily puzzle games like Wordle) gives a reason to come back, and
Learn mode explains the evidence behind each date.

### Accuracy first

A game that teaches art history has to be right. So the project follows one strict rule:
**nothing the game says about a painting is invented or guessed.** Every clue comes from either

1. the museum's own catalog record for that object (its culture, period, artist's dates,
   medium, and curator-written label text), or
2. a short list of general art-history facts, each quoted from and linked to a published source
   such as The Met's *Heilbrunn Timeline of Art History*, the Museum of Fine Arts, Boston's
   CAMEO materials database, or the Kress Program in Paintings Conservation.

The game never analyzes the image itself or makes claims about a specific painting that a
source doesn't support. "What to look for" hallmarks are clearly labeled as general traits of a
tradition, not statements about the painting on screen.

### How the project grew

| Version | What it added |
| --- | --- |
| 1 | The original game: guess the year of random paintings from the API. |
| 2 ([PR #1](https://github.com/juslu28/harvard-hindsight/pull/1)) | Learn mode with sourced clues from the museum's catalog records. |
| 3 ([PR #2](https://github.com/juslu28/harvard-hindsight/pull/2)) | Visual "what to look for" hallmarks for 21 painting traditions, each quoted from a museum source. |
| 4 ([PR #3](https://github.com/juslu28/harvard-hindsight/pull/3)) | The daily challenge, endless Learn mode, deep zoom, and a full visual redesign. |

---

## How to play

1. Study the painting. Hover over it to magnify it 3×, or click it (or press <kbd>Z</kbd>) to
   open the full-resolution detail view and zoom into the brushwork.
2. Drag the timeline (1300–2020) or type a year, then press **Lock in guess** (<kbd>Enter</kbd>).
3. The museum's label is revealed, the timeline shows the museum's date range next to your
   guess, and "Why this date?" explains the evidence.

**Scoring (daily challenge).** "Years off" is 0 if your guess falls inside the museum's date
range; otherwise it's the distance to the nearest end of the range.
Points = 1000 × e^(−years off ÷ 75), rounded. Points drop off quickly: 25 years off earns 717,
75 years off earns 368, and 200 years off earns 69.

| Tile | Meaning |
| --- | --- |
| 🎯 | Inside the museum's date range (1,000 points) |
| 🟩 | Within 25 years |
| 🟨 | 26–75 years off |
| 🟥 | More than 75 years off |

**Keyboard:** <kbd>←</kbd> <kbd>→</kbd> nudge your guess by a year (hold <kbd>Shift</kbd> for
ten) · <kbd>Enter</kbd> lock in / next painting · <kbd>Z</kbd> detail view · <kbd>?</kbd> help ·
<kbd>Esc</kbd> close a window.

---

## How it works

### Architecture

Hindsight is a static front end plus three small serverless functions, all hosted on Vercel.
There is no database and no build step.

```
                      ┌──────────────── Vercel ────────────────┐
 Browser ── /api/daily ──▶  api/daily.js ─┐                     │
 (public/)  /api/learn ──▶  api/learn.js ─┼─ lib/harvard.js ──── api.harvardartmuseums.org
         ◀── paintings ───                │   (adds the API key)│      (Harvard Art Museums API)
                      │   lib/clues.js, lib/hallmarks.js        │
                      └─────────────────────────────────────────┘
 Images and zoom tiles load straight from Harvard's image servers (ids.lib.harvard.edu).
```

The API key lives only in a Vercel environment variable (`HARVARD_ART_MUSEUMS_API_KEY`). The
browser talks only to this site's own `/api` endpoints and never sees the key.

### API endpoints

| Endpoint | Returns | Cached on Vercel's CDN |
| --- | --- | --- |
| `GET /api/daily` | Today's date, puzzle number, reset time, and 5 rounds. Each round is an encrypted token plus image links, with **no answer data**. | Until midnight US Eastern |
| `GET /api/daily?reveal=TOKEN` | One painting's answer (title, artist, date range, culture, medium, museum link, color palette), its clues, and the museum's label text. Called only after a guess is locked in. | 7 days |
| `GET /api/learn?batch=N` | A batch of up to 60 paintings with answers and clues, for Learn mode. | 1 day |

Every request asks the museum's `/object` endpoint for paintings that have a public image
(`imagepermissionlevel:0`) and were made between 1300 and 2020. Paintings dated to a range wider
than 60 years are skipped so every question is fair.

### The daily puzzle

- **Same five for everyone.** "Today" is the date in US Eastern time. The server asks the API
  for a seeded shuffle (`sort=random:YYYYMMDD`), so every request on the same day gets the same
  order. A picker then keeps the set varied: different artists, at most two from one culture,
  and no two paintings from the same 50-year window.
- **Answers stay hidden.** Instead of the museum's object ID (which would let someone look up
  the answer), the browser gets a token: the ID encrypted with AES-256-GCM, using a key derived
  from the API key. The answer is only fetched from `/api/daily?reveal=TOKEN` after a guess.
- **Cheap to run.** The response is cached on Vercel's CDN until midnight Eastern (daylight
  saving is handled), so the museum API is called only a handful of times a day no matter how
  many people play.
- **One try per day.** Progress, results, streaks, and stats are stored in the browser's
  `localStorage`. You can leave mid-puzzle and resume where you left off.

### Learn mode

The browser requests random batch numbers from `/api/learn`. Each batch is a fixed, cached
shuffle, so heavy use doesn't exhaust the API key's daily request limit. Paintings already seen
in the session are skipped, and the next batch loads in the background, so the mode never runs
out. Ending a session shows a summary of the paintings and traditions you met.

### Clues and hallmarks

Clues are built on the server by `lib/clues.js` from the catalog record:

| Clue | Where it comes from |
| --- | --- |
| Culture | The museum's catalog record |
| Historical period | The museum's catalog record (e.g. "Edo period, 1615–1868") |
| The artist's dates | The museum's catalog record, quoted exactly |
| Materials | The medium in the catalog record, matched to sourced facts: acrylic paint (sold from 1947), egg tempera on panel (standard before oil in Western Europe), gold leaf on Italian panels |
| What to look for | `lib/hallmarks.js`: hallmarks for 21 traditions, each with a quoted, linked source |

The 21 traditions run from Muromachi-period Japanese painting and 1300s Italian painting through
Dutch Golden Age painting, French Impressionism, the Hudson River School, and Abstract
Expressionism. A painting only gets hallmarks when its culture and date in the catalog match a
tradition, and paintings with sparse records simply get fewer clues.

### Images and deep zoom

- The page shows a resized image from the museum's image server. Requests are capped at the
  original's size, because the server will otherwise enlarge images and waste bandwidth.
- The hover magnifier loads a high-resolution copy of the same image.
- The detail view uses [OpenSeadragon](https://openseadragon.github.io/) (loaded on first use)
  with Harvard's IIIF image service, which streams 512-pixel tiles so you can zoom to the full
  resolution of the museum's photograph. If the IIIF service can't be reached, it falls back to
  a single large image.

### Front end

Plain HTML, CSS, and JavaScript modules. The design is a dark "gallery after hours" look: a
gilded frame under a picture light, a museum wall label that's revealed after you guess, a soft
spotlight that follows the mouse, drifting dust, a custom cursor, a paint burst on perfect
guesses, and a "salon wall" of real thumbnails on the home screen. The layout sizes the painting
and its label to fit any laptop window, and adjusts as you resize.

### Project structure

```
harvard-hindsight/
├── api/
│   ├── daily.js        ← /api/daily: today's puzzle and answer reveals
│   └── learn.js        ← /api/learn: batches of paintings for Learn mode
├── lib/
│   ├── harvard.js      ← shared server code: API calls, filters, image links, encrypted tokens
│   ├── clues.js        ← sourced clues built from the museum's catalog record
│   └── hallmarks.js    ← visual hallmarks for 21 painting traditions, each with a quoted source
├── public/
│   ├── index.html      ← the page
│   ├── style.css       ← the design
│   ├── app.js          ← game logic: daily, learn, timeline, scoring, stats, sharing, keyboard
│   ├── fx.js           ← spotlight, dust, custom cursor, magnifier, paint burst, salon wall
│   └── zoom.js         ← deep-zoom viewer (OpenSeadragon + IIIF)
├── vercel.json         ← tells Vercel to serve the public/ folder
├── package.json
├── .env.example        ← template for a local key file
└── .gitignore          ← keeps .env.local (your key) out of GitHub
```

---

## Run or deploy your own copy

You'll need a free Harvard Art Museums API key
([request one here](https://harvardartmuseums.org/collections/api)).

### Deploy to Vercel

1. Fork or clone this repository to your GitHub account.
2. At <https://vercel.com>, sign in with GitHub, click **Add New → Project**, and import the
   repository.
3. Set **Framework Preset** to `Other` and leave the build settings blank (`vercel.json`
   already handles them).
4. Under **Environment Variables**, add `HARVARD_ART_MUSEUMS_API_KEY` with your key, then click
   **Deploy**.

After that, every push to `main` redeploys automatically, and every other branch gets its own
preview URL. If you add or change the key later, redeploy so the change takes effect.
**Quick check:** `https://YOUR-SITE.vercel.app/api/daily` should return JSON with today's
`date`, `puzzle`, and 5 `rounds`.

### Run locally

The `/api` functions need a server, so opening `index.html` directly won't work. Use the Vercel
CLI:

```bash
npm install -g vercel
cp .env.example .env.local      # then paste your key into .env.local
vercel dev                      # visit http://localhost:3000
```

> Never commit your API key. It belongs only in Vercel's settings and in `.env.local`, which
> git ignores.

---

## Credits

- Images and collection data: [Harvard Art Museums](https://harvardartmuseums.org), via the
  [Harvard Art Museums API](https://github.com/harvardartmuseums/api-docs). Check the API's terms
  before using this beyond a personal or educational project.
- Clue sources: The Met's [Heilbrunn Timeline of Art History](https://www.metmuseum.org/essays/timeline-of-art-history),
  the [CAMEO materials database](https://cameo.mfa.org) (Museum of Fine Arts, Boston), and the
  [Kress Program in Paintings Conservation](https://artcons.artsci.udel.edu/kress) (University of
  Delaware). Each clue links to its exact source in the game.
- Deep zoom: [OpenSeadragon](https://openseadragon.github.io/). Fonts: Cormorant Garamond and
  Inter (Google Fonts).
