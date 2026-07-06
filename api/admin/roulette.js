// Admin API для настроек рулетки
import { supabaseRequest } from '../../lib/supabase.js';

const DEFAULT_PRIZES = [
    { prize_amount: 0.1, probability_weight: 40 },
    { prize_amount: 0.5, probability_weight: 25 },
    { prize_amount: 0.8, probability_weight: 15 },
    { prize_amount: 1, probability_weight: 10 },
    { prize_amount: 2, probability_weight: 5 },
    { prize_amount: 5, probability_weight: 3 },
    { prize_amount: 10, probability_weight: 1.5 },
    { prize_amount: 100, probability_weight: 0.5 }
];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { method } = req;

        if (method === 'GET') {
            const { telegram_id, action } = req.query;

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
            if (telegram_id) {
                try {
                    userSettings = await supabaseRequest('roulette_user_settings', 'GET', null, {
                        telegram_id: `eq.${telegram_id}`,
                        order: 'prize_amount.asc'
                    }) || [];
                } catch {
                    userSettings = [];
                }
            }

            return res.status(200).json({
                success: true,
                global_settings: globalSettings,
                user_settings: userSettings
            });
        }

        if (method === 'PUT') {
            const { global_settings, user_settings, telegram_id } = req.body;

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
            return res.status(200).json({ success: true, message: 'Персональные настройки удалены' });
        }

        return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
    } catch (error) {
        console.error('Admin roulette API error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

async function getGlobalSettings() {
    try {
        const settings = await supabaseRequest('roulette_settings', 'GET', null, {
            order: 'prize_amount.asc'
        });
        if (settings && settings.length > 0) return settings;
    } catch (e) {
        console.warn('roulette_settings table may not exist:', e.message);
    }
    return DEFAULT_PRIZES;
}
