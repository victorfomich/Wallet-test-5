import { supabaseRequest } from './supabase.js';

export const MIN_AMOUNT_USD = 300;

const CRYPTO_TYPES = ['usdt', 'ton', 'sol', 'trx'];
const PAYMENT_METHODS = ['bank', 'wise', 'revolut', 'tbank', 'umoney', 'phone'];
const MERCHANT_SIDES = ['buy', 'sell'];

async function merchantsRequest(table, method = 'GET', data = null, params = {}) {
    const url = process.env.MERCHANTS_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.MERCHANTS_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (url && key && (process.env.MERCHANTS_SUPABASE_URL || process.env.MERCHANTS_SUPABASE_SERVICE_KEY)) {
        let endpoint = `${url}/rest/v1/${table}`;
        if (Object.keys(params).length > 0 && method !== 'POST') {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => searchParams.append(k, v));
            endpoint += `?${searchParams.toString()}`;
        }

        const options = {
            method,
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            }
        };
        if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Merchants Supabase error: ${response.status} - ${errorText}`);
        }
        if (method === 'DELETE') return null;
        return response.json();
    }

    return supabaseRequest(table, method, data, params);
}

function normalizeMerchant(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name || '',
        is_verified: row.is_verified === true,
        crypto_type: row.crypto_type || 'usdt',
        payment_method: row.payment_method || 'bank',
        merchant_side: row.merchant_side === 'sell' ? 'sell' : 'buy',
        min_amount: parseFloat(row.min_amount || 0),
        max_amount: parseFloat(row.max_amount || 0),
        rate: parseFloat(row.rate || 0),
        is_active: row.is_active !== false,
        rating: parseInt(row.rating || 0, 10),
        total_deals: parseInt(row.total_deals || 0, 10)
    };
}

async function getMerchants() {
    const rows = await merchantsRequest('merchants', 'GET', null, {
        order: 'crypto_type.asc,payment_method.asc,merchant_side.asc,id.asc'
    });
    return (rows || []).map(normalizeMerchant);
}

function parseMerchantBody(body = {}) {
    const cryptoType = String(body.crypto_type || 'usdt').toLowerCase();
    const paymentMethod = String(body.payment_method || 'bank').toLowerCase();
    const merchantSide = body.merchant_side === 'sell' ? 'sell' : 'buy';
    const minAmount = parseFloat(body.min_amount);
    const maxAmount = parseFloat(body.max_amount);
    const rate = parseFloat(body.rate);
    const rating = parseInt(body.rating || 0, 10);

    return {
        name: String(body.name || '').trim(),
        is_verified: body.is_verified === true,
        crypto_type: CRYPTO_TYPES.includes(cryptoType) ? cryptoType : 'usdt',
        payment_method: PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'bank',
        merchant_side: MERCHANT_SIDES.includes(merchantSide) ? merchantSide : 'buy',
        min_amount: Number.isFinite(minAmount) ? minAmount : MIN_AMOUNT_USD,
        max_amount: Number.isFinite(maxAmount) ? maxAmount : 0,
        rate: Number.isFinite(rate) ? rate : 0,
        is_active: body.is_active !== false,
        rating: Number.isFinite(rating) ? rating : 0,
        total_deals: parseInt(body.total_deals || 0, 10) || 0,
        updated_at: new Date().toISOString()
    };
}

function validateMerchantPayload(payload) {
    if (!payload.name) return 'Укажите имя мерчанта';
    if (!Number.isFinite(payload.min_amount) || payload.min_amount < MIN_AMOUNT_USD) {
        return `Минимальная сумма не может быть меньше $${MIN_AMOUNT_USD}`;
    }
    if (!Number.isFinite(payload.max_amount) || payload.max_amount <= 0) {
        return 'Укажите корректную максимальную сумму';
    }
    if (payload.max_amount < payload.min_amount) {
        return 'Максимальная сумма должна быть больше минимальной';
    }
    if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
        return 'Укажите корректный курс';
    }
    if (payload.rating < 0 || payload.rating > 100) {
        return 'Рейтинг должен быть от 0 до 100';
    }
    return null;
}

export async function handleAdminP2p(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const { method } = req;

    if (method === 'GET') {
        const merchants = await getMerchants();
        return res.status(200).json({
            success: true,
            min_amount_usd: MIN_AMOUNT_USD,
            merchants
        });
    }

    if (method === 'POST') {
        const payload = parseMerchantBody(req.body);
        const validationError = validateMerchantPayload(payload);
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        const created = await merchantsRequest('merchants', 'POST', payload);
        const merchant = normalizeMerchant(Array.isArray(created) ? created[0] : created);
        return res.status(200).json({ success: true, merchant });
    }

    if (method === 'PATCH') {
        const id = req.body?.id || req.query?.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Не указан id мерчанта' });
        }

        const payload = parseMerchantBody(req.body);
        const validationError = validateMerchantPayload(payload);
        if (validationError) {
            return res.status(400).json({ success: false, error: validationError });
        }

        const updated = await merchantsRequest('merchants', 'PATCH', payload, { id: `eq.${id}` });
        const merchant = normalizeMerchant(Array.isArray(updated) ? updated[0] : updated);
        return res.status(200).json({ success: true, merchant });
    }

    if (method === 'DELETE') {
        const id = req.query?.id || req.body?.id;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Не указан id мерчанта' });
        }

        await merchantsRequest('merchants', 'DELETE', null, { id: `eq.${id}` });
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
}
