import { supabaseRequest } from '../supabase.js';

// API: Настройки обмена (комиссия и минимальные суммы)
// Храним в таблице public.app_settings ключи:
//  - exchange_fee_percent (число, %)
//  - exchange_min_usdt, exchange_min_eth, exchange_min_ton, exchange_min_sol, exchange_min_trx (числа в монете)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { method } = req;

    if (method === 'GET') {
      const rows = await supabaseRequest('app_settings', 'GET', null, { select: '*' });
      const map = {};
      (rows || []).forEach(r => { map[r.key] = r.value; });
      const settings = {
        exchange_fee_percent: parseFloat(map['exchange_fee_percent'] ?? 0) || 0,
        exchange_min_usdt: parseFloat(map['exchange_min_usdt'] ?? 0) || 0,
        exchange_min_eth: parseFloat(map['exchange_min_eth'] ?? 0) || 0,
        exchange_min_ton: parseFloat(map['exchange_min_ton'] ?? 0) || 0,
        exchange_min_sol: parseFloat(map['exchange_min_sol'] ?? 0) || 0,
        exchange_min_trx: parseFloat(map['exchange_min_trx'] ?? 0) || 0,
      };
      return res.status(200).json({ success: true, settings });
    }

    if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
      const body = req.body || {};
      const updates = {
        exchange_fee_percent: sanitizeNumber(body.exchange_fee_percent, 0),
        exchange_min_usdt: sanitizeNumber(body.exchange_min_usdt, 0),
        exchange_min_eth: sanitizeNumber(body.exchange_min_eth, 0),
        exchange_min_ton: sanitizeNumber(body.exchange_min_ton, 0),
        exchange_min_sol: sanitizeNumber(body.exchange_min_sol, 0),
        exchange_min_trx: sanitizeNumber(body.exchange_min_trx, 0),
      };

      for (const [key, value] of Object.entries(updates)) {
        const existing = await supabaseRequest('app_settings', 'GET', null, { key: `eq.${key}` });
        if (existing && existing.length) {
          await supabaseRequest('app_settings', 'PATCH', { value: value, updated_at: new Date().toISOString() }, { key: `eq.${key}` });
        } else {
          await supabaseRequest('app_settings', 'POST', { key, value });
        }
      }

      return res.status(200).json({ success: true, message: 'Exchange settings saved' });
    }

    return res.status(405).json({ error: 'Метод не поддерживается' });
  } catch (e) {
    console.error('Exchange settings API error:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера', details: e.message });
  }
}

function sanitizeNumber(v, def = 0) {
  const n = parseFloat(v);
  if (Number.isFinite(n)) return n;
  return def;
}


