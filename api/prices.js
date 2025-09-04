// API: Возвращает актуальные цены монет в USD из CoinGecko

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // CoinGecko simple price (TON может называться toncoin или the-open-network)
    const ids = ['tether', 'ethereum', 'solana', 'tron', 'toncoin', 'the-open-network'];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    const resp = await fetch(url, { headers: { 'accept': 'application/json' } });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(502).json({ success: false, error: 'Price provider error', details: text });
    }
    const data = await resp.json();
    const prices = {
      usdt: Number(data?.tether?.usd ?? 1),
      eth: Number(data?.ethereum?.usd ?? 0),
      ton: Number((data?.toncoin?.usd ?? data?.['the-open-network']?.usd) ?? 0),
      sol: Number(data?.solana?.usd ?? 0),
      trx: Number(data?.tron?.usd ?? 0)
    };
    return res.status(200).json({ success: true, prices });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal error', details: e.message });
  }
}


