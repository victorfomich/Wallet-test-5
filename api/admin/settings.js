import { supabaseRequest } from '../supabase.js';

// API настроек приложения (комиссии на вывод по сетям и др.)
// Таблица public.app_settings хранит пары key/value.
// Используем ключи: fee_ton, fee_tron, fee_sol, fee_eth, fee_bnb.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { method } = req;
    if (method === 'GET') {
      // Пытаемся читать из withdraw_fees, если пусто — fallback на app_settings
      let settings = await supabaseRequest('withdraw_fees', 'GET', null, { select: '*' });
      if (!settings || settings.length === 0) {
        const rows = await supabaseRequest('app_settings', 'GET', null, { select: '*' });
        // Преобразуем пары key/value в формат network/fee, если ключи подходят
        const map = {};
        (rows || []).forEach(r => { map[r.key] = r.value; });
        settings = [
          { network: 'ton', fee: map['fee_ton'] || 0 },
          { network: 'tron', fee: map['fee_tron'] || 0 },
          { network: 'sol', fee: map['fee_sol'] || 0 },
          { network: 'eth', fee: map['fee_eth'] || 0 },
          { network: 'bnb', fee: map['fee_bnb'] || 0 }
        ];
      }
      return res.status(200).json({ success: true, settings });
    } else if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
      const updates = req.body?.settings || [];
      // Ожидаем формат [{ network: 'ton', fee: 0.01 }, ...]
      for (const { network, fee } of updates) {
        if (!network) continue;
        const existing = await supabaseRequest('withdraw_fees', 'GET', null, { network: `eq.${network}` });
        if (existing && existing.length) {
          await supabaseRequest('withdraw_fees', 'PATCH', { fee, updated_at: new Date().toISOString() }, { network: `eq.${network}` });
        } else {
          await supabaseRequest('withdraw_fees', 'POST', { network, fee });
        }
      }
      return res.status(200).json({ success: true, message: 'Settings saved' });
    } else {
      return res.status(405).json({ error: 'Метод не поддерживается' });
    }
  } catch (e) {
    console.error('Settings API error:', e);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера', details: e.message });
  }
}


