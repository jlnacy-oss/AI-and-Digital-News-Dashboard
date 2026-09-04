# Refreshing Enterprise AI Pulse

This dashboard is static — there's no backend, so "refreshing" means
regenerating `data.js` (and occasionally `onesheets.js`) and re-uploading
the files. Here's the fastest reliable way to do that once a week.

## Weekly refresh (5–10 min with an AI research assistant)

1. **Ask Claude (or your tool of choice) to research fresh items.** A good
   prompt:

   > Search for AI/enterprise-software announcements from the last 7 days
   > for each of these 22 vendors: [paste the vendor list from data.js].
   > For each item found, give me: vendor, a type from this list [Model
   > release, New feature, Platform, Partnership, Integration, Pricing,
   > Security & privacy, Governance, Event, Release notes], an impact from
   > [GA, Available now, Announced, Coming soon], the date, a one-sentence
   > paraphrased blurb, and the real source URL. Only include items you
   > actually found a source for — never invent a URL.

2. **Append the results to `window.NEWS`** in `data.js`, following the
   existing object shape:
   ```js
   { vendor: "claude", type: "Model release", impact: "available",
     date: "2026-09-10", dateLabel: "Sep 10", title: "…", url: "https://…",
     blurb: "…" }
   ```
   `vendor` must match an `id` in `window.VENDORS`. `type` must match an
   entry in `window.TYPES`. `impact` must match an `id` in `window.IMPACTS`
   (`ga`, `available`, `announced`, `coming`).

3. **Trim anything older than ~60 days** if the vendor already has 4–5
   recent items, so vendor panels don't grow unbounded. Keep at least 2–3
   items per vendor.

4. **Update `window.LAST_REFRESHED`** at the top of `data.js` to today's
   date (`YYYY-MM-DD`). The topbar's "Updated" label and "September 2026"
   period pill both read from this automatically — nothing else in the UI
   needs to change.

5. **Spot-check `onesheets.js`** if a vendor had a major platform
   announcement (a new flagship product, a KPI-moving deal, a rebrand) —
   otherwise it can stay as is; the KPI meters and capability lists are
   slower-moving than the news feed.

6. **Re-upload the five files** (`index.html`, `styles.css`, `data.js`,
   `onesheets.js`, `app.js`) wherever you're hosting it (GitHub Pages,
   Netlify, S3, etc.). Nothing else needs to change — `app.js` re-renders
   everything from `data.js`/`onesheets.js` at load time.

## Option C — fully automated (GitHub Actions)

If you'd rather not do the weekly ask-Claude step by hand, this repo
includes:

- `.github/workflows/weekly-refresh.yml` — runs every Monday (and on
  manual trigger from the Actions tab)
- `scripts/refresh-data.mjs` — calls the Claude API with the web search
  tool to research fresh items and rewrite `window.NEWS` in `data.js`
- `scripts/validate-data.mjs` — runs the same checks as above; if it
  fails, the workflow stops and nothing bad gets committed

Setup:
1. Push this project to a GitHub repo (see deployment instructions).
2. Get an API key from [console.anthropic.com](https://console.anthropic.com).
3. In the repo, go to Settings → Secrets and variables → Actions → New
   repository secret. Name it `ANTHROPIC_API_KEY`, paste the key.
4. If the repo is also connected to GitHub Pages/Netlify/Vercel for
   auto-deploy, every weekly commit will redeploy the live site
   automatically — no further action needed.
5. To test it immediately rather than waiting for Monday, go to the
   Actions tab → "Weekly data refresh" → Run workflow.

This costs a small amount of API usage per run (one Claude API call with
web search, roughly a few cents to low tens of cents depending on how
much searching it does) — there's no free tier for this part, unlike the
hosting itself.

## Data integrity checklist

Before publishing, it's worth a 30-second sanity check:

- Every `vendor` value in `NEWS` matches a `VENDORS[].id`.
- Every `type` value matches an entry in `TYPES`.
- Every `impact` value matches an `IMPACTS[].id`.
- Every vendor still has at least one `NEWS` item (a vendor panel with
  zero items renders empty).
- Real URLs only — no placeholder or guessed links. If you can't find a
  specific dated article, link to that vendor's official newsroom/blog
  root instead of fabricating a path.

If you have Node available, this snippet catches the first three:

```js
const fs = require("fs");
global.window = {};
eval(fs.readFileSync("data.js", "utf8"));
const vendorIds = new Set(window.VENDORS.map(v => v.id));
const bad = window.NEWS.filter(n =>
  !vendorIds.has(n.vendor) ||
  !window.TYPES.includes(n.type) ||
  !window.IMPACTS.some(i => i.id === n.impact)
);
console.log(bad.length ? bad : "All news items valid.");
```
