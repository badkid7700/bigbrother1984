// Vercel serverless function — live PLTR quote for the Surveillance Index.
// Runs server-side, so there is no CORS problem and no API key to expose.
// Primary source: Yahoo v8 chart (keyless, needs a browser-like UA).
// Fallback: Stooq CSV (keyless). Cached at the edge to stay well within limits.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=120');

  const UA =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // 1) Yahoo Finance v8 chart — gives price, previous close, currency, market state.
  try {
    const r = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/PLTR?range=1d&interval=1d',
      { headers: { 'User-Agent': UA, Accept: 'application/json' } }
    );
    if (r.ok) {
      const j = await r.json();
      const m =
        j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
      if (m && typeof m.regularMarketPrice === 'number') {
        const price = m.regularMarketPrice;
        const prev =
          typeof m.chartPreviousClose === 'number'
            ? m.chartPreviousClose
            : typeof m.previousClose === 'number'
            ? m.previousClose
            : price;
        const change = price - prev;
        return res.status(200).json({
          symbol: 'PLTR',
          price,
          prevClose: prev,
          change,
          changePct: prev ? (change / prev) * 100 : 0,
          currency: m.currency || 'USD',
          marketState: m.marketState || '',
          source: 'yahoo',
          asOf: Date.now(),
        });
      }
    }
  } catch (e) {
    // fall through to Stooq
  }

  // 2) Stooq CSV fallback — live price only (no reliable previous close in this feed),
  //    so we return the price and leave change null rather than fabricate a move.
  try {
    const r = await fetch('https://stooq.com/q/l/?s=pltr.us&f=sd2t2ohlcv&h&e=csv', {
      headers: { 'User-Agent': UA },
    });
    if (r.ok) {
      const txt = await r.text();
      const lines = txt.trim().split('\n');
      if (lines.length >= 2) {
        const cols = lines[1].split(','); // Symbol,Date,Time,Open,High,Low,Close,Volume
        const price = parseFloat(cols[6]);
        if (!isNaN(price)) {
          return res.status(200).json({
            symbol: 'PLTR',
            price,
            prevClose: null,
            change: null,
            changePct: null,
            currency: 'USD',
            marketState: '',
            source: 'stooq',
            asOf: Date.now(),
          });
        }
      }
    }
  } catch (e) {
    // fall through to error
  }

  return res.status(502).json({ error: 'quote unavailable' });
}
