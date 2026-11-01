# Hindsight: a daily art-dating game

A game built on the [Harvard Art Museums API](https://github.com/harvardartmuseums/api-docs).
You see a painting from the collection with no title and no artist, look closely (magnifier
and full-resolution zoom), and guess the year it was made.

- **Daily challenge:** five paintings a day, the same for everyone, one try. New puzzle at
  midnight US Eastern. Up to 1,000 points per painting, a shareable emoji result, and a
  streak and stats saved in your browser.
- **Learn mode:** endless, no score. Reveal sourced clues and visual "what to look for"
  hallmarks, then see why each painting dates when it does.

Scoring: years off = 0 if your guess is inside the museum's date range, otherwise the distance
to the nearest end of it. Points = 1000 × e^(−years off / 75).
🎯 inside the range · 🟩 within 25 years · 🟨 26–75 years · 🟥 more than 75 years.

## How it's built

```
harvard-hindsight/
├── api/
│   ├── daily.js        ← GET /api/daily: today's 5 paintings (answers hidden)
│   │                     GET /api/daily?reveal=TOKEN: one painting's answer, after a guess
│   └── learn.js        ← GET /api/learn?batch=N: a batch of paintings with clues, for Learn mode
├── lib/
│   ├── harvard.js      ← shared server code: museum API calls, filters, sealed tokens
│   ├── clues.js        ← sourced clues built from the museum's catalog record
│   └── hallmarks.js    ← visual hallmarks for 21 painting traditions, each with a quoted source
├── public/
│   ├── index.html      ← the page
│   ├── style.css       ← "gallery after hours" design
│   ├── app.js          ← game logic (daily, learn, timeline, stats, sharing, keyboard)
│   ├── fx.js           ← spotlight, dust, custom cursor, magnifier, paint burst, salon wall
│   └── zoom.js         ← deep-zoom viewer (OpenSeadragon + the museum's IIIF image service)
├── vercel.json         ← tells Vercel to serve the public/ folder
├── package.json
├── .env.example        ← template for your local key file
└── .gitignore          ← keeps .env.local out of GitHub
```

There is no build step. The only third-party code is OpenSeadragon, loaded from cdnjs the
first time someone opens the detail view.

### The daily puzzle

- "Today" is the date in US Eastern time. The 5 paintings are picked from the museum's
  paintings with a seeded shuffle (`sort=random:YYYYMMDD`), so everyone gets the same set.
  The picker also keeps the set varied: different artists, at most 2 from one culture, and
  no two from the same 50-year window.
- The response is cached on Vercel's CDN until midnight Eastern, so the museum API is
  called only a few times a day.
- Answers stay on the server. The browser gets an encrypted token for each painting instead
  of the museum's object ID, and asks `/api/daily?reveal=TOKEN` only after a guess is
  locked in. The encryption key is derived from your API key, so there's nothing extra to set up.
- One try per day, your progress (you can leave and resume) and your stats are stored in
  your browser's localStorage.

### Learn mode

The browser picks random batch numbers and calls `/api/learn?batch=N`. Each batch is a
fixed shuffle that's cached for a day, so heavy use doesn't exhaust the API key's daily
limit. Paintings already seen in the session are skipped.

## 1. GitHub

This project lives at <https://github.com/juslu28/harvard-hindsight>. To work on it locally:

```bash
git clone https://github.com/juslu28/harvard-hindsight.git
cd harvard-hindsight
# edit files, then:
git add .
git commit -m "Describe your change"
git push
```

> Never put your API key in any file you commit. The key only goes into Vercel's
> settings (step 2) and, if you want to run the site locally, into `.env.local`, which git ignores.

## 2. Deploy with Vercel and add your API key

1. Go to <https://vercel.com>, sign in with GitHub, and click **Add New → Project**.
2. Pick your `harvard-hindsight` repository and click **Import**.
3. On the configure screen:
   - **Framework Preset:** `Other`
   - Leave Build Command and Output Directory blank (`vercel.json` already sets them).
   - Open **Environment Variables** and add:
     - **Key:** `HARVARD_ART_MUSEUMS_API_KEY`
     - **Value:** your API key
     - Environments: Production, Preview, and Development
4. Click **Deploy**. In about 30 seconds you'll get a URL like `harvard-hindsight.vercel.app`.

From now on, every `git push` to `main` redeploys automatically, and every other branch
gets its own preview URL.

**If you add or change the key after the first deploy:** go to Project → Settings →
Environment Variables, save the change, then open **Deployments** and **Redeploy**
the latest one. Environment variables only apply to new deployments.

**Quick check:** visit `https://YOUR-SITE.vercel.app/api/daily`. You should see JSON
with today's `date`, `puzzle` number and 5 `rounds`. If you see an error about
`HARVARD_ART_MUSEUMS_API_KEY`, the variable is missing or the site needs a redeploy.

## 3. Run it locally (optional)

Opening `index.html` directly won't work, because the `/api` functions need a server. Use the Vercel CLI:

```bash
npm install -g vercel
cp .env.example .env.local      # then paste your key into .env.local
vercel dev                      # visit http://localhost:3000
```

(Or run `vercel link` and then `vercel env pull .env.local` to download the key you already set in Vercel.)

## How the API key is used

The browser never sees the key. Here's the flow:

```
Browser ──/api/daily, /api/learn──▶ Vercel functions ──api.harvardartmuseums.org/object?apikey=…──▶ Harvard
        ◀──── trimmed paintings ───                  ◀──────────── museum records ──────────────────
```

Every request asks the museum's `/object` endpoint for paintings that have an image the
museum allows at full size (`imagepermissionlevel:0`) and are dated 1300–2020. Paintings
with a date range wider than 60 years are skipped so every question is fair.

Image credit: Harvard Art Museums. Check their API terms before using this for anything beyond a personal or educational project.
