# Ministry of Truth: Operations Desk — Design

**Date:** 2026-09-07 · **Status:** approved
A local-only content command center for $BIGBROTHER. Not deployed; runs on the user's machine.

## Goal

One unified local interface for all content work: generating on-voice text (replies + originals), rendering it into the brand's visual vessels (Studio video/still, FILE dossier cards, STATUS REPORT cards), browsing all local assets, and copying generation prompts.

## Architecture

- `desk/server.js` — dependency-free Node server (Node 18+, native fetch). Serves the desk UI and repo files, exposes JSON endpoints. Port **1984**.
- `desk/desk.html` — single-page UI, vanilla HTML/JS/CSS in the site's visual language (red `#cf2418` / cream `#f2e6cd` palette, Archivo Black + IBM Plex Mono, grain/scanline/vignette).
- `desk/.env` (gitignored) — `ANTHROPIC_API_KEY=...`. `desk/.env.example` committed.
- `desk/posted-log.json` (gitignored) — log of replies/posts actually used, for repetition avoidance.

### Server endpoints
- `GET /` → desk UI. Static serving for `/desk/*`, `/assets/*`, and repo root files (so `/studio.html` iframes locally).
- `GET /api/assets` → recursive listing of `assets/` (images, video, audio) as JSON.
- `POST /api/generate` → `{mode: "reply"|"draft", input, vertical?, pillar?}`. Reads `BIGBROTHER_brand_guide.md` + `BIGBROTHER_reply_playbook.md` from disk at request time as the cached system prompt; includes recent posted-log entries to avoid repeats; calls the Claude API; returns 3 candidates on the escalation ladder (reply mode: stamp / one-liner / Receipt) or 3 pillar drafts (draft mode).
- `GET /api/stats` → proxies the live site's `api/bb` + `api/pltr` endpoints for real pair/holder data feeding the STATUS REPORT (manual override always available in UI).
- `GET|POST /api/log` → read/append the posted log.

### UI panels
1. **Reply Desk** — paste tweet text, tag vertical (playbook §2–§12 categories as chips), get 3 candidates, one-click copy, "mark as posted" logs it.
2. **Drafting Desk** — pillar picker (WHISPER one-liner / Receipt / OFFICIAL notice / broadcast script), optional topic seed, 3 candidates. Voice linter runs on any text (banned words, exclamation marks, non-👁 emoji, register mixing) + litmus checklist. Every candidate has "→ Studio", "→ FILE", "→ REPORT" flow buttons.
3. **Vessels** (inside Drafting Desk):
   - **Studio** — `studio.html` embedded via iframe from the local server. Invisible `postMessage` hooks added to `studio.html` (no visible UI change to the deployed site): receive text into the text slot; trigger a still PNG export (`canvas.toBlob`). Video export uses the studio's existing Record & download.
   - **FILE generator** — dossier card recreated as a desk-native canvas (1080×1440), form-driven fields (subject ID, location, coordinates, network, device, etc.), PNG download. Matches `assets/dossier-*.png` layout.
   - **STATUS REPORT generator** — report card recreated as desk-native canvas (1080×1350), day number auto-incremented from a stored counter, stats prefilled from `/api/stats`, all fields editable, PNG download. Matches `assets/surveillance-report.png` layout.
4. **Asset Library** — grid browser over `/api/assets` with previews (img/video/audio), click-to-copy path, filter by type/folder.
5. **Prompt Shelf** — video prompts + post banks parsed from the local markdown docs into copy-ready cards; style block auto-appended on video-prompt copy.

## Decisions
- Local-only; no auth. API key server-side only.
- No build tooling, no npm dependencies.
- Brand guide markdown files are the single source of truth for the voice engine — read at request time.
- Hedra API integration and tweet-URL fetching are explicitly out of scope for v1.

## Error handling
- Missing API key → clear in-UI message with setup instructions, everything non-LLM still works.
- Stats fetch failure → report fields fall back to editable blanks.
- Log file absent → created on first write.

## Testing
- Server smoke-tested via curl (static, /api/assets, /api/stats, /api/generate error path without key).
- Canvas vessels verified by generating PNGs and visually inspecting.
