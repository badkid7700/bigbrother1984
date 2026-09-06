# CA Relaunch Mechanism — Design

Date: 2026-09-05
Status: Approved for implementation

## Problem

$BIGBROTHER is relaunching with a new contract address. There will be a downtime
window with no functioning CA. The site must (1) scrub every trace of the old CA
now, (2) present a coherent no-CA state during downtime, and (3) make activating
the new CA a one-line edit (doable from GitHub web; Vercel auto-deploys).

## Single source of truth

`token-config.json` at the repo root:

```json
{ "ca": "" }
```

- Empty string → downtime state site-wide.
- Paste the new address → whole site goes live on next deploy: visible CA, both
  buy buttons, explorer link, dossier image, and live stats.
- Buy URL (Matcha) and explorer URL are derived from the CA in code; chain ID
  (4663) and sell token stay as code constants since they don't change.

## Frontend (`index.html`)

The baked-in HTML default IS the downtime state — no CA appears anywhere in the
file, ever again. A small script fetches `token-config.json` (no-store) on load;
a non-empty `ca` upgrades the page to live mode. Fail-safe direction: if the
fetch fails, the site shows no address rather than a stale one.

### Downtime state (default)

- Contract cell (`#cacode`): `WITHHELD — AWAITING OFFICIAL ISSUE`, styled like
  the existing redacted Supply blocks. Copy button remains; clicking toasts
  "Nothing to copy. The record is sealed." and logs in-voice.
- Hero "Buy $BIGBROTHER" button, acquire-section Matcha button, and explorer
  link: hidden. "How to buy" and "Open your file" remain.
- Live-fetched numbers (hero market cap, holders, 24h buys/sells, volume,
  active wallets): show "—"; `/api/bb` is not called.
- Supply section static copy is UNCHANGED — same launchpad, same tokenomics:
  the 1,000,000,000 total supply figure, fee/liquidity copy all stay visible.
- Dossier canvas prints `CONTRACT: WITHHELD`.

### Marquee (both states)

Bottom scrolling ticker drops `1,000,000,000 SUPPLY · EVERY UNIT NUMBERED` and
`$BIGBROTHER / PLTR`; adds `BIG BROTHER IS WATCHING YOU`. Resulting rotation:
WE WATCH · WE TRACK · WE RECORD · WE NEVER STOP · BIG BROTHER IS WATCHING YOU ·
NO PERMISSION REQUIRED · YOUR FILE IS OPEN.

### Live state (ca present)

- `#cacode` shows the CA; copy button copies it.
- Hero + acquire Matcha buttons get
  `https://meta.matcha.xyz/robinhood?buyToken=<ca>&chainId=4663&sellToken=0xeee…`;
  explorer link gets `https://robinhoodchain.blockscout.com/token/<ca>`.
- `/api/bb` is polled as today; all live numbers populate.
- Dossier prints the CA.

## API (`api/bb.js`)

Imports the same `token-config.json`. Empty `ca` → respond `{ live: false }`
immediately (short cache), no GeckoTerminal calls. Otherwise use `ca` as
`BB_TOKEN` — holders and all other live info come from this endpoint against
the new CA.

## Scrub (immediate)

Old CA `0x41bad95fd76dc3148e36cec38948688ffc1a1e18` removed from:

1. `index.html:449` hero Matcha link
2. `index.html:590` `#cacode` text
3. `index.html:594` acquire Matcha link
4. `index.html:595` Blockscout link
5. `index.html:1400` dossier hardcoded fallback
6. `api/bb.js:7` `BB_TOKEN`
7. `api/BB-07E0-O11K_dossier.png` — deleted (generated image containing old CA)

Old CA in git history is acceptable (always public).

## Off-repo checklist (manual, owner)

X bio / pinned posts, Telegram pins, DEX-screener & GeckoTerminal listings
still referencing the old CA.

## Relaunch day

Edit `token-config.json`, paste the new CA, commit. Vercel deploys; site fully
live. No other file touched.

## Testing

- Serve locally; verify downtime state renders (no CA, buttons hidden, dashes).
- Set a dummy CA in `token-config.json`; verify buttons/links/CA populate and
  dossier prints it.
- Verify `/api/bb` returns `{live:false}` with empty CA.
- `grep -ri 41bad` returns nothing.
