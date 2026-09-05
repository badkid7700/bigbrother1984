// Vercel serverless function — live PLTR price for the Surveillance Index.
// Runs server-side (no CORS issue, no key exposed to the browser).
//
// PRIMARY: GeckoTerminal (CoinGecko's on-chain API) — the on-chain PLTR Stock Token
//   price on Robinhood Chain, i.e. the exact asset $BIGBROTHER is paired against.
//   Keyless and works from cloud IPs. Attribution: data by CoinGecko / GeckoTerminal.
// FALLBACKS: Finnhub (if FINNHUB_API_KEY is set), then Yahoo, then Stooq.
//
// Cached at the edge so upstream is hit at most ~once per 45s regardless of traffic.

const GT_NETWORK = 'robinhood';
const PLTR_TOKEN = '0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a'; // PLTR stock token, Robinhood Chain
const PLTR_POOL = '0x851680416a4f4e1c463d45171d61acddbc8554c0';  // Uniswap V3 (Robinhood) PLTR/USDG
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fromGecko() {
  const H = { Accept: 'application/json' };
  // Pool endpoint: gives on-chain price + 24h change. Only trust it when PLTR is the base token.
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/pools/${PLTR_POOL}`,
      { headers: H }
    );
    if (r.ok) {
      const j = await r.json();
      const a = j && j.data && j.data.attributes;
      const rel = j && j.data && j.data.relationships;
      const baseId = ((rel && rel.base_token && rel.base_token.data && rel.base_token.data.id) || '').toLowerCase();
      if (a && baseId.indexOf(PLTR_TOKEN) > -1) {
        const price = parseFloat(a.base_token_price_usd);
        let pct = a.price_change_percentage ? parseFloat(a.price_change_percentage.h24) : null;
        if (!isFinite(pct)) pct = null;
        if (isFinite(price) && price > 0) {
          const prev = pct != null ? price / (1 + pct / 100) : null;
          return {
            price,
            prevClose: prev,
            change: prev != null ? price - prev : null,
            changePct: pct,
            marketState: 'ONCHAIN',
            source: 'geckoterminal',
          };
        }
      }
    }
  } catch (e) {}

  // Token-price endpoint fallback: unambiguous price, no change %.
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/simple/networks/${GT_NETWORK}/token_price/${PLTR_TOKEN}`,
      { headers: H }
    );
    if (r.ok) {
      const j = await r.json();
      const tp = j && j.data && j.data.attributes && j.data.attributes.token_prices;
      const price = tp ? parseFloat(tp[PLTR_TOKEN] || tp[Object.keys(tp)[0]]) : NaN;
      if (isFinite(price) && price > 0) {
        return { price, prevClose: null, change: null, changePct: null, marketState: 'ONCHAIN', source: 'geckoterminal' };
      }
    }
  } catch (e) {}

  return null;
}

async function fromFinnhub() {
  const KEY = process.env.FINNHUB_API_KEY || process.env.FINNHUB_KEY;
  if (!KEY) return null;
  try {
    const r = await fetch('https://finnhub.io/api/v1/quote?symbol=PLTR', {
      headers: { 'X-Finnhub-Token': KEY, Accept: 'application/json' },
    });
    if (r.ok) {
      const j = await r.json();
      if (j && typeof j.c === 'number' && j.c > 0) {
        const fresh = j.t && Date.now() / 1000 - j.t < 900;
        return {
          price: j.c,
          prevClose: typeof j.pc === 'number' ? j.pc : null,
          change: typeof j.d === 'number' ? j.d : null,
          changePct: typeof j.dp === 'number' ? j.dp : null,
          marketState: fresh ? 'REGULAR' : '',
          source: 'finnhub',
        };
      }
    }
  } catch (e) {}
  return null;
}

async function fromYahoo() {
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/PLTR?range=1d&interval=1d',
      { headers: { 'User-Agent': UA, Accept: 'application/json' } }
    );
    if (r.ok) {
      const j = await r.json();
      const m = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
      if (m && typeof m.regularMarketPrice === 'number') {
        const price = m.regularMarketPrice;
        const prev =
          typeof m.chartPreviousClose === 'number' ? m.chartPreviousClose
          : typeof m.previousClose === 'number' ? m.previousClose : price;
        const change = price - prev;
        return {
          price, prevClose: prev, change,
          changePct: prev ? (change / prev) * 100 : 0,
          marketState: m.marketState || '', source: 'yahoo',
        };
      }
    }
  } catch (e) {}
  return null;
}

async function fromStooq() {
  try {
    const r = await fetch('https://stooq.com/q/l/?s=pltr.us&f=sd2t2ohlcv&h&e=csv', { headers: { 'User-Agent': UA } });
    if (r.ok) {
      const txt = await r.text();
      const lines = txt.trim().split('\n');
      if (lines.length >= 2) {
        const price = parseFloat(lines[1].split(',')[6]);
        if (!isNaN(price)) {
          return { price, prevClose: null, change: null, changePct: null, marketState: '', source: 'stooq' };
        }
      }
    }
  } catch (e) {}
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=120');

  const q = (await fromGecko()) || (await fromFinnhub()) || (await fromYahoo()) || (await fromStooq());

  if (q) {
    return res.status(200).json({ symbol: 'PLTR', currency: 'USD', asOf: Date.now(), ...q });
  }
  return res.status(502).json({ error: 'quote unavailable', hint: 'all upstream sources refused' });
}
