// Second (secure) Supabase project client. Reads credentials ONLY from server env vars.

function getSecureClient() {
  const url = process.env.VW_RUNTIME_DB_URL || process.env.SECURE_DB_URL || process.env.SECOND_SUPABASE_URL;
  const serviceKey = process.env.VW_RUNTIME_DB_SERVICE_KEY || process.env.SECURE_DB_SERVICE_KEY || process.env.SECOND_SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Secure Supabase credentials are not configured');
  }
  return { url, key: serviceKey };
}

export async function supabaseSecureRequest(table, method = 'GET', data = null, params = {}) {
  const client = getSecureClient();

  let url = `${client.url}/rest/v1/${table}`;
  if (Object.keys(params).length > 0 && method !== 'POST') {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => sp.append(k, v));
    url += `?${sp.toString()}`;
  }

  const headers = {
    'apikey': client.key,
    'Authorization': `Bearer ${client.key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const options = { method, headers };
  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Secure Supabase error: ${resp.status} - ${text}`);
  }
  return await resp.json();
}

export default { supabaseSecureRequest };


