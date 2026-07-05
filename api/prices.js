// API: Возвращает актуальные цены монет в USD

import { getLivePrices } from '../lib/prices.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const forceRefresh = req.query.refresh === '1';
    const prices = await getLivePrices({ forceRefresh });
    if (!prices) {
      return res.status(502).json({ success: false, error: 'Price provider unavailable' });
    }
    return res.status(200).json({ success: true, prices });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal error', details: e.message });
  }
}


