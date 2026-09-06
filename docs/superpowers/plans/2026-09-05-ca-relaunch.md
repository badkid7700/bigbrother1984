# CA Relaunch Mechanism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrub the old contract address, ship a fail-safe downtime state, and make activating the new CA a one-line edit to `token-config.json`.

**Architecture:** `token-config.json` at repo root is the single source of truth. `index.html` bakes in the downtime state (no CA anywhere) and a loader script upgrades to live mode when the config holds an address. `api/bb.js` imports the same config and short-circuits with `{live:false}` when empty.

**Tech Stack:** Static HTML/vanilla JS on Vercel; one Vercel serverless function (ESM). No test framework exists in this repo — verification is grep + local static serve + manual browser check, per existing project practice.

**Spec:** `docs/superpowers/specs/2026-09-05-ca-relaunch-design.md`

---

### Task 1: Config file + API short-circuit

**Files:**
- Create: `token-config.json`
- Modify: `api/bb.js:1-9`

- [ ] **Step 1: Create `token-config.json`**

```json
{
  "ca": ""
}
```

- [ ] **Step 2: Replace the hardcoded token constant in `api/bb.js`**

Replace lines 1–7 (comment block + `GT_NETWORK`/`BB_TOKEN` consts). Old:

```js
const GT_NETWORK = 'robinhood';
const BB_TOKEN = '0x41bad95fd76dc3148e36cec38948688ffc1a1e18';
```

New (keep the existing comment block above it, update nothing else in it):

```js
import tokenConfig from '../token-config.json' with { type: 'json' };

const GT_NETWORK = 'robinhood';
const BB_TOKEN = (tokenConfig.ca || '').trim();
```

- [ ] **Step 3: Short-circuit the handler when no CA**

At the top of `handler`, immediately after the existing `res.setHeader('Cache-Control', ...)` line, add:

```js
  if (!BB_TOKEN) {
    return res.status(200).json({ live: false });
  }
```

- [ ] **Step 4: Verify**

Run: `grep -c 41bad api/bb.js` → expected `0`.
Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('token-config.json','utf8')))"` → expected `{ ca: '' }`.
(The `import ... with` syntax runs on Vercel's Node 20+/22 runtime; the frontend already treats any `/api/bb` failure as "no data", so this fails safe.)

- [ ] **Step 5: Commit**

```bash
git add token-config.json api/bb.js
git commit -m "Add token-config.json as single CA source; bb API returns live:false when empty"
```

### Task 2: index.html — scrub CA, bake in downtime state, add config loader

**Files:**
- Modify: `index.html:449` (hero buy button), `index.html:590-595` (acquire section), `index.html:1163-1171` (copy handler), `index.html:1178` (ticker), `index.html:1400` (dossier CA), `index.html:1558` (init), plus one CSS rule near the `.ca` styles and the loader script.

- [ ] **Step 1: Hero buy button — hidden by default, no URL**

Old (line 449):

```html
<a class="btn solid" href="https://meta.matcha.xyz/robinhood?buyToken=0x41bad95fd76dc3148e36cec38948688ffc1a1e18&amp;chainId=4663&amp;sellToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" target="_blank" rel="noopener">Buy $BIGBROTHER</a>
```

New:

```html
<a class="btn solid" id="buybb" href="#" target="_blank" rel="noopener" style="display:none">Buy $BIGBROTHER</a>
```

- [ ] **Step 2: Acquire section — withheld CA, hidden trade/explorer buttons**

Old (lines 590–595):

```html
    <code id="cacode">0x41bad95fd76dc3148e36cec38948688ffc1a1e18</code>
    <button id="copyca">Copy address</button>
  </div>
  <div class="cabtns">
    <a class="tradebtn" href="https://meta.matcha.xyz/robinhood?buyToken=0x41bad95fd76dc3148e36cec38948688ffc1a1e18&amp;chainId=4663&amp;sellToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" target="_blank" rel="noopener">Buy $BIGBROTHER on Matcha</a>
    <a class="explorerbtn" href="https://robinhoodchain.blockscout.com/token/0x41bad95fd76dc3148e36cec38948688ffc1a1e18" target="_blank" rel="noopener">View contract on the Robinhood Chain explorer</a>
  </div>
```

New:

```html
    <code id="cacode" class="withheld">WITHHELD — AWAITING OFFICIAL ISSUE</code>
    <button id="copyca">Copy address</button>
  </div>
  <div class="cabtns" id="cabtns" style="display:none">
    <a class="tradebtn" id="tradebtn" href="#" target="_blank" rel="noopener">Buy $BIGBROTHER on Matcha</a>
    <a class="explorerbtn" id="explorerbtn" href="#" target="_blank" rel="noopener">View contract on the Robinhood Chain explorer</a>
  </div>
```

- [ ] **Step 3: CSS for the withheld state**

Next to the existing `.ca code` rules in the stylesheet, add:

```css
.ca code.withheld{color:rgba(242,230,205,.6);letter-spacing:.12em}
```

- [ ] **Step 4: Copy handler honors withheld state**

In the `copy contract` block (line ~1164), at the top of the click listener add:

```js
  if($('#cacode').classList.contains('withheld')){
    toast('NOTHING TO COPY','The record is sealed. The address will appear here when it is issued.');
    log('Copy attempted. No address on file.');
    return;
  }
```

- [ ] **Step 5: Dossier — remove hardcoded fallback**

Old (line 1400):

```js
  var CA=(document.getElementById('cacode')&&document.getElementById('cacode').textContent.trim())||'0x41bad95fd76dc3148e36cec38948688ffc1a1e18';
```

New (window.BB_CA is set by the loader in Step 7; `#cacode` shows WITHHELD text during downtime, so reading it would print the right thing anyway — but be explicit):

```js
  var CA=(window.BB_CA&&window.BB_CA.trim())||'WITHHELD — AWAITING OFFICIAL ISSUE';
```

- [ ] **Step 6: Marquee phrases**

Old (line 1178):

```js
  var phrases=['WE WATCH','WE TRACK','WE RECORD','WE NEVER STOP','NO PERMISSION REQUIRED','$BIGBROTHER / PLTR','YOUR FILE IS OPEN','1,000,000,000 SUPPLY · EVERY UNIT NUMBERED'];
```

New:

```js
  var phrases=['WE WATCH','WE TRACK','WE RECORD','WE NEVER STOP','BIG BROTHER IS WATCHING YOU','NO PERMISSION REQUIRED','YOUR FILE IS OPEN'];
```

- [ ] **Step 7: Config loader + goLive()**

In the `wire + init` IIFE (line ~1553), remove `try{ bbInit(); }catch(e){}` (live stats only start when a CA exists) and add the loader after the init block:

```js
/* ============ token config — single source of truth for the CA ============ */
window.BB_CA='';
function goLive(ca){
  window.BB_CA=ca;
  var buy='https://meta.matcha.xyz/robinhood?buyToken='+ca+'&chainId=4663&sellToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  var cc=document.getElementById('cacode');
  if(cc){cc.textContent=ca;cc.classList.remove('withheld');}
  var hb=document.getElementById('buybb');
  if(hb){hb.href=buy;hb.style.display='';}
  var tb=document.getElementById('tradebtn'); if(tb)tb.href=buy;
  var eb=document.getElementById('explorerbtn'); if(eb)eb.href='https://robinhoodchain.blockscout.com/token/'+ca;
  var cb=document.getElementById('cabtns'); if(cb)cb.style.display='';
  try{ bbInit(); }catch(e){}
}
fetchJSON('/token-config.json',5000).then(function(j){
  if(j&&typeof j.ca==='string'&&/^0x[0-9a-fA-F]{40}$/.test(j.ca.trim()))goLive(j.ca.trim());
})['catch'](function(){});
```

(`fetchJSON` already exists in this file and is used for `/api/bb`. The regex gate means a typo'd address keeps the site in the safe withheld state.)

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "Bake downtime state into site; CA and live stats activate from token-config.json"
```

### Task 3: Delete generated dossier PNG containing the old CA

**Files:**
- Delete: `api/BB-07E0-O11K_dossier.png`

- [ ] **Step 1: Delete and commit**

```bash
git rm api/BB-07E0-O11K_dossier.png
git commit -m "Remove generated dossier image containing retired contract address"
```

### Task 4: Verify both states, then deploy

- [ ] **Step 1: Repo-wide scrub check**

Run: `grep -rni 41bad --exclude-dir=.git --exclude-dir=docs .`
Expected: no output. (docs/ excluded: the spec/plan reference the old CA as historical record.)

- [ ] **Step 2: Downtime state in a browser**

Run: `python3 -m http.server 8123` in the repo root, open `http://localhost:8123`.
Expected: hero has no Buy button; contract cell reads `WITHHELD — AWAITING OFFICIAL ISSUE`; no Matcha/explorer buttons; Copy address → "NOTHING TO COPY" toast; holders/24h cells show "—"; no `/api/bb` request in the network tab; marquee shows the new phrase set; dossier ("Open your file" → issue) prints `WITHHELD — AWAITING OFFICIAL ISSUE` under CONTRACT.

- [ ] **Step 3: Live state dress rehearsal (do not commit this)**

Temporarily put any valid-format address (e.g. `0x0000000000000000000000000000000000000001`) in `token-config.json`, reload.
Expected: hero Buy button appears with that address in the Matcha URL; contract cell shows the address; trade/explorer buttons appear with correct hrefs; a `/api/bb` request fires. Then `git checkout token-config.json` to restore `""`.

- [ ] **Step 4: Push (deploys downtime state immediately, per owner's call)**

```bash
git push
```

After Vercel deploys, spot-check production and confirm `https://<site>/api/bb` returns `{"live":false}`.

### Relaunch day (operator note, not a build task)

Edit `token-config.json` → `{ "ca": "0xNEWADDRESS" }` (GitHub web works), commit to main. Vercel deploys; the entire site goes live. Off-repo: update X bio/pins, Telegram pins, DEX-screener listings.
