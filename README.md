# Many Talents More — Landing Page

Static landing page for the Many Talents product suite:
- **Many Talents Prep** — test prep app
- **Many Talents Manager** — field service management (the HCP replacement)
- **Many Talents Money** — capital allocation / trading tools

## Files
- `index.html` — the page
- `style.css` — brand styling (navy + gold)
- `README.md` — this file

No build step, no dependencies. Pure HTML + CSS.

## To Preview Locally
Just open `index.html` in any browser. Or run a quick local server:

```bash
cd ManyTalentsMore
python -m http.server 8000
# Open http://localhost:8000
```

## To Deploy

### Option 1: Cloudflare Pages (recommended — free, fast, custom domain)
1. Create a GitHub repo: `manytalents-more-landing` (or similar)
2. Push these files to it
3. Go to dash.cloudflare.com → Pages → Create project → Connect to Git
4. Select the repo, leave build command blank (it's static)
5. Deploy. Get a `*.pages.dev` URL instantly.
6. Add custom domain in Pages settings when ready.

### Option 2: Vercel (also free)
1. Push to GitHub
2. vercel.com → Import project → select repo
3. Framework preset: **Other**, build command: blank, output: `.`
4. Deploy

### Option 3: GitHub Pages
1. Push to GitHub
2. Settings → Pages → Source: main branch, root directory
3. URL: `username.github.io/repo-name`

## What to Edit

- **Card links:** The three `<a href="#">` in `index.html` — point each to the actual app URLs
  - Prep: eventually `https://prep.manytalents.more` or similar
  - Manager: `https://app.manytalents.more` or `https://manytalentsmore.v.frappe.cloud`
  - Money: TBD
- **Product taglines and descriptions:** tweak to match final positioning
- **Colors:** edit `:root` variables in `style.css` (currently navy #0D2137 + gold #F5D623)
- **Favicon:** currently a bolt emoji — replace with a real logo SVG

## Domain Ideas
- `manytalents.more` (if the .more TLD is available — check)
- `manytalentsmore.com`
- `mtm.tools`
- `parabletoolkit.com`

## Brand Voice
The parable of the talents (Matthew 25) is the through-line — the concept is that
every gift, resource, or opportunity entrusted to you should be multiplied, not buried.
The tagline "Multiply every talent entrusted to you" anchors this.
