import { supabaseRequest } from './supabase.js';

export const DEFAULT_MIN_AMOUNT_USD = 300;

function normalizeMerchant(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name || '',
        merchant_type: row.merchant_type === 'buy' ? 'buy' : 'sell',
        price: parseFloat(row.price || 0),
        price_currency: row.price_currency || 'USD',
        min_amount: parseFloat(row.min_amount || DEFAULT_MIN_AMOUNT_USD),
        max_amount: row.max_amount != null ? parseFloat(row.max_amount) : null,
        deals_count: parseInt(row.deals_count || 0, 10),
        payment_methods: row.payment_methods || '',
        completion_rate: row.completion_rate != null ? parseFloat(row.completion_rate) : null,
        response_time: row.response_time || '',
        note: row.note || '',
        is_enabled: row.is_enabled !== false,
        sort_order: parseInt(row.sort_order || 100, 10)
    };
}

async function getSettings() {
    const rows = await supabaseRequest('p2p_settings', 'GET', null, { id: 'eq.1' });
    const row = rows?.[0];
    return {
        min_amount_usd: parseFloat(row?.min_amount_usd || DEFAULT_MIN_AMOUNT_USD)
    };
}

async function getMerchants({ enabledOnly = false } = {}) {
    const params = { order: 'sort_order.asc,id.asc' };
    if (enabledOnly) params.is_enabled = 'eq.true';
    const rows = await supabaseRequest('p2p_merchants', 'GET', null, params);
    return (rows || []).map(normalizeMerchant);
}

function parseMerchantBody(body = {}) {
    const merchantType = body.merchant_type === 'buy' ? 'buy' : 'sell';
    const minAmount = parseFloat(body.min_amount);
    const maxAmount = body.max_amount === '' || body.max_amount == null
        ? null
        : parseFloat(body.max_amount);
    const completionRate = body.completion_rate === '' || body.completion_rate == null
        ? null
        : parseFloat(body.completion_rate);

    return {
        name: String(body.name || '').trim(),
        merchant_type: merchantType,
        price: parseFloat(body.price),
        price_currency: String(body.price_currency || 'USD').trim().toUpperCase(),
        min_amount: Number.isFinite(minAmount) ? minAmount : DEFAULT_MIN_AMOUNT_USD,
        max_amount: Number.isFinite(maxAmount) ? maxAmount : null,
        deals_count: parseInt(body.deals_count || 0, 10) || 0,
        payment_methods: String(body.payment_methods || '').trim(),
        completion_rate: Number.isFinite(completionRate) ? completionRate : null,
        response_time: String(body.response_time || '').trim(),
        note: String(body.note || '').trim(),
        is_enabled: body.is_enabled !== false,
        sort_order: parseInt(body.sort_order || 100, 10) || 100,
        updated_at: new Date().toISOString()
    };
}

function validateMerchantPayload(payload, globalMin = DEFAULT_MIN_AMOUNT_USD) {
    const floor = Math.max(DEFAULT_MIN_AMOUNT_USD, globalMin);
    if (!payload.name) return 'Укажите имя мерчанта';
    if (!Number.isFinite(payload.price) || payload.price <= 0) return 'Укажите корректную цену';
    if (!Number.isFinite(payload.min_amount) || payload.min_amount < floor) {
        return `Минимальная сумма не может быть меньше $${floor}`;
    }
    if (payload.max_amount != null && payload.max_amount < payload.min_amount) {
        return 'Максимальная сумма должна быть больше минимальной';
    }
    return null;
}

export async function handleUserP2p(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
    }

    const [settings, merchants] = await Promise.all([
        getSettings(),
        getMerchants({ enabledOnly: true })
    ]);

    const globalMin = settings.min_amount_usd;
    const filtered = merchants
        .map(m => ({
            ...m,
            min_amount: Math.max(m.min_amount, globalMin)
        }))
        .filter(m => m.is_enabled);

    return res.status(200).json({
        success: true,
        settings: { min_amount_usd: globalMin },
        merchants: filtered
    });
}

export async function handleAdminP2p(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const { method } = req;

    if (method === 'GET') {
        const [settings, merchants] = await Promise.all([
            getSettings(),
            getMerchants({ enabledOnly: false })
        ]);
        return res.status(200).json({ success: true, settings, merchants });
    }

    if (method === 'POST') {
        const action = req.body?.action;

        if (action === 'save_settings') {
            const minAmount = parseFloat(req.body?.min_amount_usd);
            if (!Number.isFinite(minAmount) || minAmount < DEFAULT_MIN_AMOUNT_USD) {
                return res.status(400).json({
                    success: false,
                    error: `Глобальный минимум не может быть меньше $${DEFAULT_MIN_AMOUNT_USD}`
                });
            }

            const rows = await supabaseRequest('p2p_settings', 'PATCH', {
                min_amount_usd: minAmount,
                updated_at: new Date().toISOString()
            }, { id: 'eq.1' });

            return res.status(200).json({
                success: true,
                settings: {
                    min_amount_usd: parseFloat(rows?.[0]?.min_amount_usd || minAmount)
                }
            });
        }

        const payload = parseMerchantBody(req.body);
        const settings = await getSettings();
        const validationError = validateMerchantPayload(payload, settings.min_amount_usd);
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        const created = await supabaseRequest('p2p_merchants', 'POST', payload);
        const merchant = normalizeMerchant(Array.isArray(created) ? created[0] : created);
        return res.status(200).json({ success: true, merchant });
    }

    if (method === 'PATCH') {
        const id = req.body?.id || req.query?.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Не указан id мерчанта' });
        }

        const payload = parseMerchantBody(req.body);
        const settings = await getSettings();
        const validationError = validateMerchantPayload(payload, settings.min_amount_usd);
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        const updated = await supabaseRequest('p2p_merchants', 'PATCH', payload, { id: `eq.${id}` });
        const merchant = normalizeMerchant(Array.isArray(updated) ? updated[0] : updated);
        return res.status(200).json({ success: true, merchant });
    }

    if (method === 'DELETE') {
        const id = req.query?.id || req.body?.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Не указан id мерчанта' });
        }

        await supabaseRequest('p2p_merchants', 'DELETE', null, { id: `eq.${id}` });
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
}
