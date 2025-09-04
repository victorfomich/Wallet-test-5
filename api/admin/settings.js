import { supabaseRequest } from '../supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { method } = req;
    if (method === 'GET') {
      const rows = await supabaseRequest('app_settings', 'GET');
      return res.status(200).json({ success: true, settings: rows || [] });
    } else if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
      const updates = req.body?.settings || [];
      for (const { key, value } of updates) {
        const existing = await supabaseRequest('app_settings', 'GET', null, { key: `eq.${key}` });
        if (existing && existing.length) {
          await supabaseRequest('app_settings', 'PATCH', { value }, { key: `eq.${key}` });
        } else {
          await supabaseRequest('app_settings', 'POST', { key, value });
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


