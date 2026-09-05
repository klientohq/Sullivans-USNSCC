# website — the whole Cloudflare site, in one folder

| Folder | What it is |
|---|---|
| `src/` | **Source.** Pages, partials, layouts, CSS layers, JSON data, and the build, verify and deploy scripts. Edit here. |
| `public/` | **Build output. This is what gets deployed** and nothing else. Never hand-edit a file in here; the next build overwrites it. |

## Commands (run from the repo root)

```
npm run build    # src -> public
npm run verify   # link and placeholder gate over public
npm run gate     # build then verify, the pre-deploy check
npm run deploy   # gate, then push public to Cloudflare Pages
```

## Hosts

| Host | URL | How it publishes |
|---|---|---|
| Cloudflare Pages | https://sullivans-usnscc.pages.dev | `npm run deploy` (wrangler direct upload of `public/`) |
| GitHub Pages | https://klientohq.github.io/Sullivans-USNSCC/ | `.github/workflows/pages.yml` on every push to `main` |

GitHub Pages can only serve `/` or `/docs` from a branch, so it publishes through the workflow
rather than a branch path. That is why the workflow exists: it is what lets the site live in a
folder instead of scattered across the repo root.

Private folders (`media-library/`, `project-work/`, `.wrangler/`) are siblings of `website/`, never
inside `public/`. The deploy script asserts that before every upload.
