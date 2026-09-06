// Vercel serverless function — live $BIGBROTHER price for the hero.
// Source: GeckoTerminal (CoinGecko's on-chain API), Robinhood Chain. Keyless.
// Price from the token endpoint (unambiguous); 24h change from the token's top
// pool where BIGBROTHER is the base token. Attribution: data by CoinGecko.

import tokenConfig from '../token-config.json' with { type: 'json' };

const GT_NETWORK = 'robinhood';
const BB_TOKEN = (tokenConfig.ca || '').trim();

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=90');
  if (!BB_TOKEN) {
    return res.status(200).json({ live: false });
  }
  const H = { Accept: 'application/json' };
  let price = null,
    changePct = null,
    mcap = null,
    totalSupply = null,
    holders = null,
    vol24 = null,
    buys24 = null,
    sells24 = null,
    buyers24 = null,
    sellers24 = null;

  // Token endpoint — aggregated USD price, total supply (and market cap / FDV if present).
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/tokens/${BB_TOKEN}`,
      { headers: H }
    );
    if (r.ok) {
      const j = await r.json();
      const a = j && j.data && j.data.attributes;
      if (a) {
        const p = parseFloat(a.price_usd);
        if (isFinite(p) && p > 0) price = p;
        const mc = parseFloat(a.market_cap_usd != null ? a.market_cap_usd : a.fdv_usd);
        if (isFinite(mc)) mcap = mc;
        const ts = parseFloat(a.normalized_total_supply);
        if (isFinite(ts) && ts > 0) totalSupply = ts;
      }
    }
  } catch (e) {}

  // Token info endpoint — holders count (GeckoTerminal refreshes this ~daily).
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/tokens/${BB_TOKEN}/info`,
      { headers: H }
    );
    if (r.ok) {
      const j = await r.json();
      const a = j && j.data && j.data.attributes;
      const hc = a && a.holders && parseInt(a.holders.count, 10);
      if (isFinite(hc) && hc > 0) holders = hc;
    }
  } catch (e) {}

  // Top pool where BIGBROTHER is the base token — for a clean 24h change %.
  try {
    const r = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${GT_NETWORK}/tokens/${BB_TOKEN}/pools?page=1`,
      { headers: H }
    );
    if (r.ok) {
      const j = await r.json();
      const arr = (j && j.data) || [];
      for (let i = 0; i < arr.length; i++) {
        const pool = arr[i];
        const rel = pool && pool.relationships;
        const baseId = ((rel && rel.base_token && rel.base_token.data && rel.base_token.data.id) || '').toLowerCase();
        if (baseId.indexOf(BB_TOKEN) > -1) {
          const a = pool.attributes || {};
          if (price == null) {
            const p = parseFloat(a.base_token_price_usd);
            if (isFinite(p) && p > 0) price = p;
          }
          const pct = a.price_change_percentage ? parseFloat(a.price_change_percentage.h24) : NaN;
          if (isFinite(pct)) changePct = pct;
          const v = a.volume_usd ? parseFloat(a.volume_usd.h24) : NaN;
          if (isFinite(v)) vol24 = v;
          const tx = a.transactions && a.transactions.h24;
          if (tx) {
            if (isFinite(tx.buys)) buys24 = tx.buys;
            if (isFinite(tx.sells)) sells24 = tx.sells;
            if (isFinite(tx.buyers)) buyers24 = tx.buyers;
            if (isFinite(tx.sellers)) sellers24 = tx.sellers;
          }
          break;
        }
      }
    }
  } catch (e) {}

  if (price == null) {
    return res.status(502).json({ error: 'quote unavailable' });
  }
  const prev = changePct != null ? price / (1 + changePct / 100) : null;
  return res.status(200).json({
    symbol: 'BIGBROTHER',
    currency: 'USD',
    price,
    prevClose: prev,
    change: prev != null ? price - prev : null,
    changePct,
    marketCap: mcap,
    totalSupply,
    holders,
    vol24,
    buys24,
    sells24,
    buyers24,
    sellers24,
    source: 'geckoterminal',
    asOf: Date.now(),
  });
}
