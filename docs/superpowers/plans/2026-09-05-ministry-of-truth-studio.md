# Ministry of Truth Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the local clip maker as bigbrother1984.com/studio (Ministry of Truth) with a mobile share-sheet + desktop Post-on-X flow.

**Architecture:** Copy `clip-studio.html` (gitignored local tool) to a new tracked `studio.html`; rebrand head/header, add a bottom marquee, and bolt a share flow onto the existing MediaRecorder finish handler. `vercel.json` with `cleanUrls` gives the `/studio` URL. Two links added to `index.html`.

**Tech Stack:** Static HTML/vanilla JS on Vercel. Canvas + MediaRecorder engine is reused untouched. No test framework in repo — verification is grep + inline-JS syntax check + local serve, per existing practice.

**Spec:** `docs/superpowers/specs/2026-09-05-ministry-of-truth-studio-design.md`

---

### Task 1: Create studio.html (copy + rebrand + marquee + share flow)

**Files:**
- Create: `studio.html` (from `clip-studio.html`)

- [ ] **Step 1: Copy the file**

```bash
cp clip-studio.html studio.html
```

- [ ] **Step 2: Rebrand head metadata**

In `studio.html`, replace:

```html
<title>BIG BROTHER — Clip Studio</title>
```

with:

```html
<title>Ministry of Truth — $BIGBROTHER studio</title>
<meta name="description" content="Manufacture the truth. Post it. Big Brother is watching you.">
<meta property="og:title" content="Ministry of Truth — $BIGBROTHER studio">
<meta property="og:description" content="Manufacture the truth. Post it. Big Brother is watching you.">
<meta property="og:url" content="https://www.bigbrother1984.com/studio">
<meta property="og:type" content="website">
```

- [ ] **Step 3: Rebrand the header, link the eye home**

Replace:

```html
<header>
  <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M2 32Q32 6 62 32Q32 58 2 32Z" fill="#f2e6cd"/><circle cx="32" cy="32" r="15" fill="#9a9059" stroke="#100c0a" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="#100c0a"/></svg>
  <span class="t">Clip Studio</span>
  <span class="s">$BIGBROTHER · short-form generator</span>
</header>
```

with:

```html
<header>
  <a href="/" aria-label="Back to Big Brother" style="display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none">
    <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M2 32Q32 6 62 32Q32 58 2 32Z" fill="#f2e6cd"/><circle cx="32" cy="32" r="15" fill="#9a9059" stroke="#100c0a" stroke-width="4"/><circle cx="32" cy="32" r="6" fill="#100c0a"/></svg>
    <span class="t">Ministry of Truth</span>
  </a>
  <span class="s">PRODUCE YOUR OWN BROADCAST · $BIGBROTHER</span>
</header>
```

(`header svg` and `header .t` CSS rules still match — the elements just moved inside the anchor.)

- [ ] **Step 4: Add share buttons to the result card**

Replace:

```html
      <div class="tips" id="tips">Download, then upload to X, TikTok, Reels, or Shorts.</div>
```

with:

```html
      <div class="sharerow">
        <button type="button" id="sharebtn" class="sharebig" style="display:none">Share clip</button>
        <a id="xbtn" class="sharebig" href="#" target="_blank" rel="noopener">Post on X</a>
      </div>
      <div class="tips" id="tips">Download, then upload to X, TikTok, Reels, or Shorts.</div>
```

And add CSS next to the existing `.result video` rule (line ~84):

```css
.sharerow{display:flex;gap:10px;flex-wrap:wrap;padding:12px 14px 0}
.sharebig{flex:1;min-width:140px;text-align:center;background:var(--red);color:var(--cream);border:1px solid var(--red);
  padding:12px 16px;font-family:var(--display);font-size:13px;letter-spacing:.04em;text-transform:uppercase;
  text-decoration:none;cursor:pointer}
.sharebig:hover{background:var(--cream);color:var(--red);border-color:var(--cream)}
```

- [ ] **Step 5: Wire the share flow in finishRecord**

In `finishRecord()`, after the line `v.src=url; a.href=url; a.download='bigbrother-clip.'+ext;` add:

```js
  setupShare(blob, ext);
```

Then add these functions directly after `finishRecord`'s closing brace:

```js
/* ---------- share flow ---------- */
var XCAPTION='Big Brother is watching you. $BIGBROTHER @BigBrotherOnRH bigbrother1984.com';
function setupShare(blob, ext){
  var xb=$('#xbtn');
  xb.href='https://twitter.com/intent/tweet?text='+encodeURIComponent(XCAPTION);
  var sb=$('#sharebtn');
  var file=null;
  try{ file=new File([blob],'bigbrother-clip.'+ext,{type:blob.type}); }catch(e){}
  if(file && navigator.canShare && navigator.canShare({files:[file]})){
    sb.style.display='';
    sb.onclick=function(){
      navigator.share({files:[file], text:XCAPTION})
        .then(function(){ setStatus('The Ministry thanks you for your contribution.'); })
        ['catch'](function(){ /* user closed the sheet — not an error */ });
    };
  }else{
    sb.style.display='none';
  }
}
```

- [ ] **Step 6: Extend the tips copy to explain the X-intent attach step**

In `finishRecord`, replace the MP4 tips line:

```js
    tips.textContent='Ready to post as-is — X, TikTok, Reels, and Shorts all take MP4. Download, then upload.';
```

with:

```js
    tips.textContent='Ready to post — X, TikTok, Reels, and Shorts all take MP4. “Post on X” opens the caption; attach the downloaded clip to it.';
```

(WebM warning branch stays exactly as is.)

- [ ] **Step 7: Add the bottom marquee**

Before `</body>`, add:

```html
<div class="tick"><span class="tr2" id="tickrow"></span></div>
```

Add CSS (next to the header rules):

```css
.tick{border-top:1px solid var(--rule);background:var(--red);color:var(--cream);overflow:hidden;white-space:nowrap;padding:10px 0;margin-top:34px}
.tick .tr2{display:inline-block;animation:tickmove 34s linear infinite;font-family:var(--display);font-size:13px;letter-spacing:.06em}
.tick .tr2 i{font-style:normal;opacity:.45;margin:0 18px}
@keyframes tickmove{from{transform:translateX(0)}to{transform:translateX(-50%)}}
```

Add JS at the end of the main script (before the boot section):

```js
/* ---------- ticker ---------- */
(function(){
  var phrases=['WE WATCH','WE TRACK','WE RECORD','WE NEVER STOP','BIG BROTHER IS WATCHING YOU','NO PERMISSION REQUIRED','YOUR FILE IS OPEN'];
  var s='';
  for(var k=0;k<2;k++)for(var i=0;i<phrases.length;i++)s+=phrases[i]+'<i>◆</i>';
  $('#tickrow').innerHTML=s;
})();
```

- [ ] **Step 8: Verify and commit**

Run: `grep -io "0x[0-9a-f]\{40\}" studio.html` → expected: no output.
Run: extract inline scripts and `node --check` them (see Task 4 Step 1 for the command).

```bash
git add studio.html
git commit -m "Add Ministry of Truth: public clip studio with share-sheet and Post-on-X flow"
```

### Task 2: vercel.json for the /studio clean URL

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "cleanUrls": true
}
```

(Serves `/studio` → `studio.html`. `/` and `/api/*` are unaffected; `/index.html` now 308s to `/`, which is fine.)

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "Serve clean URLs so /studio resolves"
```

### Task 3: Link the studio from index.html

**Files:**
- Modify: `index.html:448-452` (hero CTA row), `index.html:610-613` (footer links)

- [ ] **Step 1: Hero CTA button**

Replace:

```html
      <a class="btn" href="#file">Open your file</a>
```

with:

```html
      <a class="btn" href="#file">Open your file</a>
      <a class="btn" href="/studio">Make a broadcast</a>
```

- [ ] **Step 2: Footer link**

Replace:

```html
    <a href="#file">Your file</a><a href="#classified">Supply</a><a href="#acquire">Acquire</a>
```

with:

```html
    <a href="#file">Your file</a><a href="#classified">Supply</a><a href="#acquire">Acquire</a><a href="/studio">Ministry of Truth</a>
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Link Ministry of Truth studio from hero and footer"
```

### Task 4: Verify and deploy

- [ ] **Step 1: Static checks**

```bash
grep -io "0x[0-9a-f]\{40\}" studio.html                       # expect: nothing
grep -c "BIG BROTHER IS WATCHING YOU" studio.html             # expect: 1
python3 -c "
import re
html=open('studio.html').read()
s=re.findall(r'<script[^>]*>(.*?)</script>',html,re.S)
open('<scratchpad>/studio-inline.js','w').write('\n;\n'.join(s))"
node --check <scratchpad>/studio-inline.js                     # expect: silence (OK)
```

(`<scratchpad>` = the session scratchpad directory.)

- [ ] **Step 2: Local serve**

Run `python3 -m http.server 8123` (background), then:

```bash
curl -s http://localhost:8123/studio.html | grep -o "Ministry of Truth\|sharebtn\|xbtn\|tickrow" | sort | uniq -c
```

Expected: each token present at least once. Load the page in a browser if the extension is available; otherwise owner verifies record + share on a real phone/desktop after deploy (MediaRecorder and share sheets are browser-specific).

- [ ] **Step 3: Push and verify production**

```bash
git push
```

Then poll until live:

```bash
curl -s https://www.bigbrother1984.com/studio | grep -c "Ministry of Truth"   # expect: >=1
curl -s https://www.bigbrother1984.com/ | grep -c "/studio"                   # expect: 2
```

Confirm `https://www.bigbrother1984.com/` still loads and `/api/bb` still returns `{"live":false}` (vercel.json addition must not disturb existing routes).
