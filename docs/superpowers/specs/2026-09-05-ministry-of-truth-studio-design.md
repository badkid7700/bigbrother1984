# Ministry of Truth — Public Clip Studio Design

Date: 2026-09-05
Status: Approved for implementation

## Problem

The clip maker (`clip-studio.html`) is a local, gitignored tool. Visitors should
be able to make their own $BIGBROTHER clips on the website and post them to X
and other socials.

## Approach

Promote the existing tool: copy `clip-studio.html` to a new tracked
`studio.html`, rebrand as the Ministry of Truth, match the site's chrome, and
add a share flow. No rebuild — the canvas/recorder engine is kept as-is.
`clip-studio.html` remains gitignored as the owner's local scratch version.

## Page: `studio.html` → bigbrother1984.com/studio

- New `vercel.json` at repo root: `{ "cleanUrls": true }` so `/studio` serves
  `studio.html` (`/` and all other routes unaffected).
- Header matches the main site: eye favicon/wordmark linking back to `/`;
  title **MINISTRY OF TRUTH**; sub-line "Produce your own broadcast."
- Meta/OG tags: title "Ministry of Truth — $BIGBROTHER studio", description
  "Manufacture the truth. Post it. Big Brother is watching you." OG url
  `https://www.bigbrother1984.com/studio`.
- Bottom scrolling marquee with the current phrase set: WE WATCH · WE TRACK ·
  WE RECORD · WE NEVER STOP · BIG BROTHER IS WATCHING YOU · NO PERMISSION
  REQUIRED · YOUR FILE IS OPEN.
- No contract address anywhere on the page (nothing to wire to
  token-config.json).

## Studio mechanics (unchanged from clip-studio.html)

Presets (already in the new first-person voice), custom line (60 chars) +
sub-line inputs, 9:16 / 1:1 / 16:9 formats, ~8s timeline, preview loop,
MediaRecorder capture with baked-in audio drone, MP4-preferred/WebM-fallback
with the existing convert-first guidance. Fully client-side: nothing is
uploaded or stored by the site; user-typed text exists only on their device
until they post the clip themselves.

## Share flow (new)

After a recording finishes:

- **Share clip** button — shown only when
  `navigator.canShare({files:[<recorded video File>]})` is true (mobile
  browsers, some desktop). Opens the native share sheet with the video file
  attached; user picks X / TikTok / IG / anywhere. On success, status line:
  "The Ministry thanks you for your contribution."
- **Post on X** button — always shown. Opens
  `https://twitter.com/intent/tweet?text=<encoded caption>` in a new tab.
  Caption: `Big Brother is watching you. $BIGBROTHER @BigBrotherOnRH
  bigbrother1984.com`. User attaches the downloaded file to the pre-filled
  post. Tips text explains the attach step.
- **Download** button — unchanged.

## Links from the main site (`index.html`)

- Footer links row: add "Ministry of Truth" → `/studio`.
- Hero CTA row: add a fourth button "Make a broadcast" → `/studio`.
- No other index.html changes.

## Testing

- `grep` checks: no CA patterns in studio.html; marquee phrases present.
- Inline-JS syntax check (extract scripts, `node --check`).
- Local serve: page renders, presets populate, canvas draws.
- Owner verifies record + share on a real phone and desktop (MediaRecorder
  and share-sheet behavior are browser-specific).

## Out of scope

Server-side rendering or hosting of user clips, clip galleries, moderation
(nothing is hosted), TikTok/IG deep links (their web intents don't accept
video files; the share sheet covers apps on mobile).
