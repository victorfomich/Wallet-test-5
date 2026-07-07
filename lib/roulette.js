// Shared roulette logic (merged into transactions + admin/settings to stay within Vercel function limit)
import { supabaseRequest } from './supabase.js';

export const SPIN_COST = 1;
export const DEFAULT_PRIZES = [
    { prize_amount: 0.1, probability_weight: 40 },
    { prize_amount: 0.5, probability_weight: 25 },
    { prize_amount: 0.8, probability_weight: 15 },
    { prize_amount: 1, probability_weight: 10 },
    { prize_amount: 2, probability_weight: 5 },
    { prize_amount: 5, probability_weight: 3 },
    { prize_amount: 10, probability_weight: 1.5 },
    { prize_amount: 100, probability_weight: 0.5 }
];

const DEFAULT_FORCED_RULE = {
    enabled: false,
    every_n_spins: null,
    forced_prize_amount: null,
    spins_since_forced: 0
};

export async function handleUserRoulette(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    if (req.method === 'GET') {
        const { telegram_id } = req.query;
        if (!telegram_id) {
            return res.status(400).json({ success: false, error: 'Отсутствует telegram_id' });
        }

        const balances = await supabaseRequest('user_balances', 'GET', null, {
            telegram_id: `eq.${telegram_id}`
        });
        const balance = balances[0] || { usdt_amount: 0 };
        const globalSettings = await getGlobalSettings();

        return res.status(200).json({
            success: true,
            usdt_balance: parseFloat(balance.usdt_amount || 0),
            spin_cost: SPIN_COST,
            prizes: globalSettings.map(s => parseFloat(s.prize_amount))
        });
    }

    if (req.method === 'POST') {
        const action = req.body?.action || req.query?.action;
        const telegram_id = req.body?.telegram_id;

        if (!telegram_id) {
            return res.status(400).json({ success: false, error: 'Отсутствует telegram_id' });
        }
        if (action === 'spin_start') return handleSpinStart(res, telegram_id);
        if (action === 'spin_complete') return handleSpinComplete(req, res, telegram_id);

        return res.status(400).json({ success: false, error: 'Неизвестное действие' });
    }

    return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
}

export async function handleAdminRoulette(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const { method } = req;

    if (method === 'GET') {
        const { telegram_id, action } = req.query;

        if (action === 'users') {
            const users = await supabaseRequest('users', 'GET', null, { order: 'id.asc' });
            const spins = await supabaseRequest('roulette_spins', 'GET', null, { order: 'created_at.desc' });
            const statsMap = {};

            for (const spin of (spins || [])) {
                const tg = String(spin.telegram_id);
                if (!statsMap[tg]) {
                    statsMap[tg] = { spins: 0, spent: 0, won: 0 };
                }
                statsMap[tg].spins += 1;
                statsMap[tg].spent += parseFloat(spin.spin_cost || 0);
                statsMap[tg].won += parseFloat(spin.prize_amount || 0);
            }

            const list = (users || []).map(u => {
                const tg = String(u.telegram_id);
                const st = statsMap[tg] || { spins: 0, spent: 0, won: 0 };
                return {
                    telegram_id: u.telegram_id,
                    first_name: u.first_name || '',
                    last_name: u.last_name || '',
                    username: u.username || null,
                    spins_count: st.spins,
                    total_spent: st.spent,
                    total_won: st.won,
                    net_result: st.won - st.spent
                };
            });

            list.sort((a, b) => (b.spins_count || 0) - (a.spins_count || 0));
            return res.status(200).json({ success: true, users: list });
        }

        if (action === 'history' && telegram_id) {
            const spins = await supabaseRequest('roulette_spins', 'GET', null, {
                telegram_id: `eq.${telegram_id}`,
                order: 'created_at.desc',
                limit: '100'
            });
            return res.status(200).json({ success: true, spins: spins || [] });
        }

        const globalSettings = await getGlobalSettings();
        let userSettings = [];
        let forcedRule = { ...DEFAULT_FORCED_RULE };
        if (telegram_id) {
            try {
                userSettings = await supabaseRequest('roulette_user_settings', 'GET', null, {
                    telegram_id: `eq.${telegram_id}`,
                    order: 'prize_amount.asc'
                }) || [];
            } catch {
                userSettings = [];
            }
            forcedRule = await getForcedRule(telegram_id);
        }

        return res.status(200).json({
            success: true,
            global_settings: globalSettings,
            user_settings: userSettings,
            forced_rule: forcedRule
        });
    }

    if (method === 'PUT' || method === 'PATCH' || method === 'POST') {
        const { global_settings, user_settings, telegram_id, forced_rule } = req.body || {};

        if (global_settings && Array.isArray(global_settings)) {
            for (const item of global_settings) {
                const amount = parseFloat(item.prize_amount);
                const weight = parseFloat(item.probability_weight);
                if (isNaN(amount) || isNaN(weight)) continue;

                const existing = await supabaseRequest('roulette_settings', 'GET', null, {
                    prize_amount: `eq.${amount}`
                });

                if (existing && existing.length > 0) {
                    await supabaseRequest('roulette_settings', 'PATCH', {
                        probability_weight: weight,
                        updated_at: new Date().toISOString()
                    }, { prize_amount: `eq.${amount}` });
                } else {
                    await supabaseRequest('roulette_settings', 'POST', {
                        prize_amount: amount,
                        probability_weight: weight,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            }
        }

        if (telegram_id && user_settings && Array.isArray(user_settings)) {
            for (const item of user_settings) {
                const amount = parseFloat(item.prize_amount);
                const weight = item.probability_weight === '' || item.probability_weight === null
                    ? null
                    : parseFloat(item.probability_weight);

                const existing = await supabaseRequest('roulette_user_settings', 'GET', null, {
                    telegram_id: `eq.${telegram_id}`,
                    prize_amount: `eq.${amount}`
                });

                if (weight === null) {
                    if (existing && existing.length > 0) {
                        await supabaseRequest('roulette_user_settings', 'DELETE', null, {
                            telegram_id: `eq.${telegram_id}`,
                            prize_amount: `eq.${amount}`
                        });
                    }
                } else if (existing && existing.length > 0) {
                    await supabaseRequest('roulette_user_settings', 'PATCH', {
                        probability_weight: weight,
                        updated_at: new Date().toISOString()
                    }, {
                        telegram_id: `eq.${telegram_id}`,
                        prize_amount: `eq.${amount}`
                    });
                } else {
                    await supabaseRequest('roulette_user_settings', 'POST', {
                        telegram_id: parseInt(telegram_id),
                        prize_amount: amount,
                        probability_weight: weight,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            }
        }

        if (telegram_id && forced_rule && typeof forced_rule === 'object') {
            await saveForcedRule(telegram_id, forced_rule);
        }

        return res.status(200).json({ success: true, message: 'Настройки рулетки сохранены' });
    }

    if (method === 'DELETE') {
        const { telegram_id } = req.query;
        if (!telegram_id) {
            return res.status(400).json({ success: false, error: 'Отсутствует telegram_id' });
        }
        await supabaseRequest('roulette_user_settings', 'DELETE', null, {
            telegram_id: `eq.${telegram_id}`
        });
        try {
            await supabaseRequest('roulette_user_forced_rules', 'DELETE', null, {
                telegram_id: `eq.${telegram_id}`
            });
        } catch {}
        return res.status(200).json({ success: true, message: 'Персональные настройки удалены' });
    }

    return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
}

async function getGlobalSettings() {
    try {
        const settings = await supabaseRequest('roulette_settings', 'GET', null, {
            order: 'prize_amount.asc'
        });
        if (settings && settings.length > 0) return settings;
    } catch (e) {
        console.warn('roulette_settings not found, using defaults:', e.message);
    }
    return DEFAULT_PRIZES;
}

async function getUserOverrides(telegramId) {
    try {
        return await supabaseRequest('roulette_user_settings', 'GET', null, {
            telegram_id: `eq.${telegramId}`
        }) || [];
    } catch {
        return [];
    }
}

async function getForcedRule(telegramId) {
    try {
        const rows = await supabaseRequest('roulette_user_forced_rules', 'GET', null, {
            telegram_id: `eq.${telegramId}`,
            limit: '1'
        });
        if (rows && rows.length > 0) {
            const row = rows[0];
            return {
                enabled: !!row.enabled,
                every_n_spins: row.every_n_spins ? parseInt(row.every_n_spins, 10) : null,
                forced_prize_amount: row.forced_prize_amount != null ? parseFloat(row.forced_prize_amount) : null,
                spins_since_forced: parseInt(row.spins_since_forced || 0, 10) || 0
            };
        }
    } catch {}
    return { ...DEFAULT_FORCED_RULE };
}

async function saveForcedRule(telegramId, forcedRule) {
    const enabled = !!forcedRule.enabled;
    const everyN = Number(forcedRule.every_n_spins || 0);
    const prize = forcedRule.forced_prize_amount != null && forcedRule.forced_prize_amount !== ''
        ? Number(forcedRule.forced_prize_amount)
        : null;

    const payload = {
        telegram_id: parseInt(telegramId, 10),
        enabled,
        every_n_spins: enabled && everyN > 0 ? Math.floor(everyN) : null,
        forced_prize_amount: enabled ? prize : null,
        updated_at: new Date().toISOString()
    };

    const existing = await supabaseRequest('roulette_user_forced_rules', 'GET', null, {
        telegram_id: `eq.${telegramId}`,
        limit: '1'
    });

    if (existing && existing.length > 0) {
        await supabaseRequest('roulette_user_forced_rules', 'PATCH', payload, {
            telegram_id: `eq.${telegramId}`
        });
    } else {
        await supabaseRequest('roulette_user_forced_rules', 'POST', {
            ...payload,
            spins_since_forced: 0,
            created_at: new Date().toISOString()
        });
    }
}

function buildWeights(globalSettings, userOverrides) {
    const overrideMap = {};
    for (const o of userOverrides) {
        overrideMap[String(parseFloat(o.prize_amount))] = o;
    }

    return globalSettings.map(g => {
        const amount = parseFloat(g.prize_amount);
        const key = String(amount);
        const override = overrideMap[key];
        const weight = override && override.probability_weight != null
            ? parseFloat(override.probability_weight)
            : parseFloat(g.probability_weight);
        return { prize_amount: amount, weight: Math.max(0, weight) };
    });
}

function pickPrize(weights) {
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    if (total <= 0) return weights[0]?.prize_amount || 0.1;
    let rand = Math.random() * total;
    for (const w of weights) {
        rand -= w.weight;
        if (rand <= 0) return w.prize_amount;
    }
    return weights[weights.length - 1].prize_amount;
}

async function getUserBalance(telegramId) {
    const balances = await supabaseRequest('user_balances', 'GET', null, {
        telegram_id: `eq.${telegramId}`
    });
    if (!balances || balances.length === 0) {
        throw new Error('Баланс пользователя не найден');
    }
    return balances[0];
}

async function handleSpinStart(res, telegramId) {
    const balance = await getUserBalance(telegramId);
    const currentUsdt = parseFloat(balance.usdt_amount || 0);

    if (currentUsdt < SPIN_COST) {
        return res.status(400).json({
            success: false,
            error: `Недостаточно USDT. Нужно минимум ${SPIN_COST} USDT`,
            usdt_balance: currentUsdt
        });
    }

    const pending = await supabaseRequest('roulette_spins', 'GET', null, {
        telegram_id: `eq.${telegramId}`,
        status: 'eq.spinning',
        order: 'created_at.desc',
        limit: '1'
    });
    if (pending && pending.length > 0) {
        const p = pending[0];
        return res.status(200).json({
            success: true,
            spin_id: p.id,
            prize_amount: parseFloat(p.prize_amount),
            usdt_balance: currentUsdt,
            resumed: true
        });
    }

    const globalSettings = await getGlobalSettings();
    const userOverrides = await getUserOverrides(telegramId);
    const weights = buildWeights(globalSettings, userOverrides);
    const forcedRule = await getForcedRule(telegramId);
    let prize = pickPrize(weights);

    if (forcedRule.enabled && forcedRule.every_n_spins && forcedRule.every_n_spins > 0 && forcedRule.forced_prize_amount != null) {
        const nextSpinCounter = (forcedRule.spins_since_forced || 0) + 1;
        if (nextSpinCounter >= forcedRule.every_n_spins) {
            prize = parseFloat(forcedRule.forced_prize_amount);
            try {
                await supabaseRequest('roulette_user_forced_rules', 'PATCH', {
                    spins_since_forced: 0,
                    updated_at: new Date().toISOString()
                }, {
                    telegram_id: `eq.${telegramId}`
                });
            } catch {}
        } else {
            try {
                await supabaseRequest('roulette_user_forced_rules', 'PATCH', {
                    spins_since_forced: nextSpinCounter,
                    updated_at: new Date().toISOString()
                }, {
                    telegram_id: `eq.${telegramId}`
                });
            } catch {}
        }
    }

    const newUsdt = currentUsdt - SPIN_COST;
    await supabaseRequest('user_balances', 'PATCH', {
        usdt_amount: newUsdt,
        updated_at: new Date().toISOString()
    }, { telegram_id: `eq.${telegramId}` });

    const spinRecord = await supabaseRequest('roulette_spins', 'POST', {
        telegram_id: parseInt(telegramId),
        spin_cost: SPIN_COST,
        prize_amount: prize,
        status: 'spinning',
        balance_before: currentUsdt,
        created_at: new Date().toISOString()
    });

    const spin = spinRecord[0];
    return res.status(200).json({
        success: true,
        spin_id: spin.id,
        prize_amount: prize,
        usdt_balance: newUsdt,
        deducted: SPIN_COST
    });
}

async function handleSpinComplete(req, res, telegramId) {
    const { spin_id } = req.body;
    if (!spin_id) {
        return res.status(400).json({ success: false, error: 'Отсутствует spin_id' });
    }

    const spins = await supabaseRequest('roulette_spins', 'GET', null, {
        id: `eq.${spin_id}`,
        telegram_id: `eq.${telegramId}`
    });

    if (!spins || spins.length === 0) {
        return res.status(404).json({ success: false, error: 'Спин не найден' });
    }

    const spin = spins[0];
    if (spin.status === 'completed') {
        const balance = await getUserBalance(telegramId);
        return res.status(200).json({
            success: true,
            prize_amount: parseFloat(spin.prize_amount),
            usdt_balance: parseFloat(balance.usdt_amount || 0),
            already_completed: true
        });
    }

    if (spin.status !== 'spinning') {
        return res.status(400).json({ success: false, error: 'Некорректный статус спина' });
    }

    const balance = await getUserBalance(telegramId);
    const currentUsdt = parseFloat(balance.usdt_amount || 0);
    const prize = parseFloat(spin.prize_amount);
    const newUsdt = currentUsdt + prize;

    await supabaseRequest('user_balances', 'PATCH', {
        usdt_amount: newUsdt,
        updated_at: new Date().toISOString()
    }, { telegram_id: `eq.${telegramId}` });

    await supabaseRequest('roulette_spins', 'PATCH', {
        status: 'completed',
        balance_after: newUsdt
    }, { id: `eq.${spin_id}` });

    return res.status(200).json({
        success: true,
        prize_amount: prize,
        usdt_balance: newUsdt
    });
}
