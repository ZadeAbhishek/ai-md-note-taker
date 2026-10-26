# VIBE MD

A single-user, no-backend markdown note-taker that syncs directly with a GitHub repo.

- Edit `.md` files with a formatting toolbar (headings, bold/italic, lists, links, code
  blocks) or switch to a live rendered preview.
- Saves commit straight to GitHub; edits also auto-save after a configurable idle delay.
- Create, rename, move (drag-and-drop), and delete files and folders — each a single atomic
  commit via the Git Data API.
- GitHub token and repo settings are encrypted in the browser with a passphrase (Web Crypto,
  AES-GCM) and never leave your machine.
- Light/dark theme, resizable/collapsible sidebar, optional periodic background refresh.

## Getting started

```bash
npm install
npm run dev
```

On first run you'll set a local passphrase, then provide a GitHub Personal Access Token and
the owner/repo/branch to sync with.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build locally
