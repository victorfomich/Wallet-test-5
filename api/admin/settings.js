import { supabaseRequest } from '../../lib/supabase.js';

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
      console.log('🔍 Settings API: Trying to read withdraw_fees...');
      // Пытаемся читать из withdraw_fees, если пусто — fallback на app_settings
      let settings;
      try {
        settings = await supabaseRequest('withdraw_fees', 'GET', null, { select: '*' });
        console.log('📊 withdraw_fees result:', settings);
      } catch (err) {
        console.error('❌ withdraw_fees error:', err);
        settings = null;
      }
      
      if (!settings || settings.length === 0) {
        console.log('⚠️ withdraw_fees empty, trying app_settings fallback...');
        const rows = await supabaseRequest('app_settings', 'GET', null, { select: '*' });
        console.log('📊 app_settings result:', rows);
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
        console.log('🔄 Fallback settings:', settings);
      }
      // Всегда возвращаем также карту app_settings (для совместимости) и exchange_settings (новая таблица)
      let appRows = [];
      try {
        appRows = await supabaseRequest('app_settings', 'GET', null, { select: '*' });
      } catch (e) {
        console.warn('app_settings read error:', e.message);
      }
      const app = {};
      (appRows || []).forEach(r => { app[r.key] = r.value; });
      // Новая таблица exchange_settings: одна запись с полями fee_percent, min_*
      let exchange = null;
      try {
        const exRows = await supabaseRequest('exchange_settings', 'GET', null, { select: '*', limit: '1' });
        const row = (exRows && exRows[0]) || null;
        if (row) {
          exchange = {
            exchange_fee_percent: Number(row.fee_percent || 0),
            exchange_min_usdt: Number(row.min_usdt || 0),
            exchange_min_eth: Number(row.min_eth || 0),
            exchange_min_ton: Number(row.min_ton || 0),
            exchange_min_sol: Number(row.min_sol || 0),
            exchange_min_trx: Number(row.min_trx || 0)
          };
        }
      } catch (e) {
        console.warn('exchange_settings read error:', e.message);
      }
      console.log('✅ Final settings response (fees + app + exchange):', { settingsLen: settings?.length || 0, appKeys: Object.keys(app).length, hasExchange: !!exchange });
      return res.status(200).json({ success: true, settings, app, exchange });
    } else if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
      const updates = req.body?.settings || [];
      const appUpdates = req.body?.app_settings || null; // { key: value }
      const exchangeUpdates = req.body?.exchange_settings || null; // { exchange_fee_percent, exchange_min_* }
      // 1) Комиссии выводов (withdraw_fees): ожидаем формат [{ network: 'ton', fee: 0.01 }, ...]
      if (Array.isArray(updates) && updates.length) {
        for (const { network, fee } of updates) {
          if (!network) continue;
          const existing = await supabaseRequest('withdraw_fees', 'GET', null, { network: `eq.${network}` });
          if (existing && existing.length) {
            await supabaseRequest('withdraw_fees', 'PATCH', { fee, updated_at: new Date().toISOString() }, { network: `eq.${network}` });
          } else {
            await supabaseRequest('withdraw_fees', 'POST', { network, fee });
          }
        }
      }
      // 2) Обновление app_settings (включая exchange_* ключи)
      if (appUpdates && typeof appUpdates === 'object') {
        for (const [key, value] of Object.entries(appUpdates)) {
          const existing = await supabaseRequest('app_settings', 'GET', null, { key: `eq.${key}` });
          if (existing && existing.length) {
            await supabaseRequest('app_settings', 'PATCH', { value, updated_at: new Date().toISOString() }, { key: `eq.${key}` });
          } else {
            await supabaseRequest('app_settings', 'POST', { key, value });
          }
        }
      }
      // 3) Обновление новой таблицы exchange_settings (одна строка)
      if (exchangeUpdates && typeof exchangeUpdates === 'object') {
        const exRows = await supabaseRequest('exchange_settings', 'GET', null, { select: '*', limit: '1' });
        const payload = {
          fee_percent: Number(exchangeUpdates.exchange_fee_percent || 0),
          min_usdt: Number(exchangeUpdates.exchange_min_usdt || 0),
          min_eth: Number(exchangeUpdates.exchange_min_eth || 0),
          min_ton: Number(exchangeUpdates.exchange_min_ton || 0),
          min_sol: Number(exchangeUpdates.exchange_min_sol || 0),
          min_trx: Number(exchangeUpdates.exchange_min_trx || 0),
          updated_at: new Date().toISOString()
        };
        if (exRows && exRows.length) {
          await supabaseRequest('exchange_settings', 'PATCH', payload, { id: `eq.${exRows[0].id}` });
        } else {
          await supabaseRequest('exchange_settings', 'POST', payload);
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


