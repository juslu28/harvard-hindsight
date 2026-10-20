# Hindsight: Guess the Year

A small game built on the [Harvard Art Museums API](https://github.com/harvardartmuseums/api-docs).
You see a random painting from the collection with no title and no artist, and you
drag a slider to guess the year it was made. Five rounds, up to 1,000 points each.
After each guess you see the real title, artist, and date, plus the painting's
color palette as measured by the museum.

## How it's built

```
harvard-hindsight/
├── api/
│   └── artworks.js     ← Vercel serverless function (holds the API key, server-side only)
├── public/
│   ├── index.html      ← the page
│   ├── style.css
│   └── app.js          ← game logic; calls /api/artworks (never the museum directly)
├── vercel.json         ← tells Vercel to serve the public/ folder
├── package.json
├── .env.example        ← template for your local key file
└── .gitignore          ← keeps .env.local out of GitHub
```

There is no build step and there are no dependencies.

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

From now on, every `git push` to `main` redeploys automatically.

**If you add or change the key after the first deploy:** go to Project → Settings →
Environment Variables, save the change, then open **Deployments** and **Redeploy**
the latest one. Environment variables only apply to new deployments.

**Quick check:** visit `https://YOUR-SITE.vercel.app/api/artworks`. You should see JSON
with a `rounds` array. If you see an error about `HARVARD_ART_MUSEUMS_API_KEY`, the
variable is missing or the site needs a redeploy.

## 3. Run it locally (optional)

Opening `index.html` directly won't work, because the `/api` function needs a server. Use the Vercel CLI:

```bash
npm install -g vercel
cp .env.example .env.local      # then paste your key into .env.local
vercel dev                      # visit http://localhost:3000
```

(Or run `vercel link` and then `vercel env pull .env.local` to download the key you already set in Vercel.)

## How the API key is used

The browser never sees the key. Here's the flow:

```
Browser ──GET /api/artworks──▶ Vercel function ──GET api.harvardartmuseums.org/object?apikey=…──▶ Harvard
        ◀── 5 trimmed rounds ──                ◀───────────── 40 random paintings ────────────────
```

`api/artworks.js` reads `process.env.HARVARD_ART_MUSEUMS_API_KEY`. It then requests
`/object` with these parameters:

| Parameter | Value | Why |
|---|---|---|
| `classification` | `Paintings` | keeps the game about paintings |
| `hasimage` | `1` | only works with a picture |
| `q` | `imagepermissionlevel:0` | only images the museum lets you show at full size |
| `yearmade` | `1300-2020` | matches the slider's range |
| `sort` | `random` | a new set every game |
| `size` | `40` | over-fetches, then filters down to 5 good rounds |
| `fields` | `id,title,dated,datebegin,dateend,primaryimageurl,people,culture,medium,url,colors` | only the data the game uses |

The function drops works with no image or with a date range wider than 60 years, so
every question is fair. It keeps 5 and returns only the trimmed fields. Scoring uses
the museum's `datebegin`/`dateend` range: a guess inside it gets a perfect 1,000 points.
The palette strip comes from the museum's `colors` field.

Image credit: Harvard Art Museums. Check their API terms before using this for anything beyond a personal or educational project.
