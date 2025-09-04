// API для управления балансами пользователей
import { supabaseRequest } from '../supabase.js';

// Простой in-memory кэш цен, чтобы не дёргать провайдера на каждый запрос
let __LIVE_CACHE = { ts: 0, data: null };
async function getLivePricesCached() {
    const now = Date.now();
    if (__LIVE_CACHE.data && (now - __LIVE_CACHE.ts) < 60_000) {
        return __LIVE_CACHE.data;
    }
    try {
        const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,toncoin,the-open-network,solana,tron&vs_currencies=usd&include_24hr_change=true', { headers: { 'accept': 'application/json' }});
        if (!resp.ok) throw new Error('provider not ok');
        const j = await resp.json();
        const live = {
            usdt: Number(j?.tether?.usd ?? 1),
            usdt_change: Number(j?.tether?.usd_24h_change ?? 0),
            eth: Number(j?.ethereum?.usd ?? 0),
            eth_change: Number(j?.ethereum?.usd_24h_change ?? 0),
            ton: Number((j?.toncoin?.usd ?? j?.['the-open-network']?.usd) ?? 0),
            ton_change: Number(((j?.toncoin?.usd_24h_change ?? j?.['the-open-network']?.usd_24h_change)) ?? 0),
            sol: Number(j?.solana?.usd ?? 0),
            sol_change: Number(j?.solana?.usd_24h_change ?? 0),
            trx: Number(j?.tron?.usd ?? 0),
            trx_change: Number(j?.tron?.usd_24h_change ?? 0)
        };
        __LIVE_CACHE = { ts: now, data: live };
        return live;
    } catch {
        return __LIVE_CACHE.data; // если ошибка — вернём кэш, если он есть
    }
}

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Запрещаем кеширование ответов
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { method } = req;
        
        if (method === 'GET') {
            const { telegram_id, user_id } = req.query;
            
            if (telegram_id) {
                // Получить баланс конкретного пользователя по telegram_id
                const balances = await supabaseRequest('user_balances', 'GET', null, {
                    telegram_id: `eq.${telegram_id}`
                });
                
                let userBalance;
                if (balances.length === 0) {
                    // Создаем баланс по умолчанию для нового пользователя
                    userBalance = await createDefaultBalance(telegram_id);
                } else {
                    userBalance = balances[0];
                }

                // Авто-пересчет балансов на основе завершенных транзакций
                try {
                    const txs = await supabaseRequest('wallet_transactions', 'GET', null, {
                        user_telegram_id: `eq.${telegram_id}`
                    });
                    const sums = { usdt: 0, eth: 0, ton: 0, sol: 0, trx: 0 };
                    for (const tx of (txs || [])) {
                        const cur = (tx.crypto_currency || '').toLowerCase();
                        if (!sums.hasOwnProperty(cur)) continue;
                        const withdrawAmt = parseFloat(tx.withdraw_amount || 0) || 0; // сумма к отправке
                        const feeAmt = parseFloat(tx.network_fee || 0) || 0; // комиссия сети
                        const status = (tx.transaction_status || '').toLowerCase();
                        if (tx.transaction_type === 'deposit') {
                            // Пополнение засчитываем только если завершено
                            if (status === 'completed') sums[cur] += withdrawAmt;
                        } else if (tx.transaction_type === 'withdraw') {
                            // Вывод резервирует сумму вместе с комиссией сети (gross)
                            if (status === 'completed' || status === 'pending') sums[cur] -= (withdrawAmt + feeAmt);
                        }
                    }

                    // Получаем живые цены (единые для всех) с кэшем
                    const live = await getLivePricesCached();

                    // Не пишем в БД — возвращаем поверх единые цены
                    const view = {
                        ...userBalance,
                        usdt_amount: sums.usdt,
                        eth_amount: sums.eth,
                        ton_amount: sums.ton,
                        sol_amount: sums.sol,
                        trx_amount: sums.trx,
                    };
                    if (live) {
                        view.usdt_price = live.usdt;
                        view.usdt_change_percent = live.usdt_change;
                        view.eth_price = live.eth;
                        view.eth_change_percent = live.eth_change;
                        view.ton_price = live.ton;
                        view.ton_change_percent = live.ton_change;
                        view.sol_price = live.sol;
                        view.sol_change_percent = live.sol_change;
                        view.trx_price = live.trx;
                        view.trx_change_percent = live.trx_change ?? 0;
                        view.total_usd_balance =
                            (view.usdt_amount * view.usdt_price) +
                            (view.eth_amount * view.eth_price) +
                            (view.ton_amount * view.ton_price) +
                            (view.sol_amount * view.sol_price) +
                            (view.trx_amount * view.trx_price);
                    }
                    userBalance = view;
                } catch (recalcErr) {
                    console.warn('Не удалось выполнить авто-пересчет баланса:', recalcErr.message);
                }
                
                return res.status(200).json({ 
                    success: true, 
                    balance: userBalance 
                });
                
            } else {
                // Получить все балансы с информацией о пользователях
                console.log('Получение всех балансов...');
                
                try {
                    // Сначала получаем все балансы
                    const balances = await supabaseRequest('user_balances', 'GET');
                    console.log(`Найдено ${balances.length} балансов`);
                    
                    if (balances.length === 0) {
                        console.log('Балансы не найдены, проверяем пользователей...');
                        
                        // Если балансов нет, проверяем есть ли пользователи
                        const users = await supabaseRequest('users', 'GET');
                        console.log(`Найдено ${users.length} пользователей`);
                        
                        if (users.length > 0) {
                            console.log('Создаем балансы для существующих пользователей...');
                            
                            // Создаем балансы для всех пользователей без балансов
                            for (const user of users) {
                                try {
                                    await createDefaultBalance(user.telegram_id);
                                    console.log(`Создан баланс для пользователя ${user.telegram_id}`);
                                } catch (err) {
                                    console.error(`Ошибка создания баланса для ${user.telegram_id}:`, err);
                                }
                            }
                            
                            // Получаем балансы снова
                            const newBalances = await supabaseRequest('user_balances', 'GET');
                            console.log(`После создания найдено ${newBalances.length} балансов`);
                        }
                    }
                    
                    // Получаем окончательный список балансов с пользователями
                    const finalBalances = await supabaseRequest('user_balances', 'GET');
                    const users = await supabaseRequest('users', 'GET');
                    // Живые цены — одни для всех
                    // Получаем живые цены с кэшем
                    const live = await getLivePricesCached();
                    
                    // Объединяем данные + наслаиваем единые live-цены, не изменяя БД
                    const balancesWithUsers = finalBalances.map(balance => {
                        const user = users.find(u => u.telegram_id === balance.telegram_id);
                        const view = { ...balance };
                        if (live) {
                            view.usdt_price = live.usdt;
                            view.usdt_change_percent = live.usdt_change;
                            view.eth_price = live.eth;
                            view.eth_change_percent = live.eth_change;
                            view.ton_price = live.ton;
                            view.ton_change_percent = live.ton_change;
                            view.sol_price = live.sol;
                            view.sol_change_percent = live.sol_change;
                            view.trx_price = live.trx;
                            view.trx_change_percent = live.trx_change ?? 0;
                            view.total_usd_balance =
                                (Number(view.usdt_amount||0) * live.usdt) +
                                (Number(view.eth_amount||0) * live.eth) +
                                (Number(view.ton_amount||0) * live.ton) +
                                (Number(view.sol_amount||0) * live.sol) +
                                (Number(view.trx_amount||0) * live.trx);
                        }
                        return {
                            ...view,
                            users: user || { 
                                telegram_id: balance.telegram_id, 
                                first_name: 'Unknown User' 
                            }
                        };
                    });
                    
                    console.log(`Возвращаем ${balancesWithUsers.length} балансов с данными пользователей`);
                    
                    return res.status(200).json({ 
                        success: true, 
                        balances: balancesWithUsers || [] 
                    });
                    
                } catch (error) {
                    console.error('Ошибка получения балансов:', error);
                    
                    // Максимальный fallback - возвращаем пустой массив, но успешный ответ
                    return res.status(200).json({ 
                        success: true, 
                        balances: [],
                        message: 'Балансы пока не найдены, но API работает',
                        error: error.message
                    });
                }
            }
            
        } else if (method === 'POST') {
            // Проверяем если это обновление баланса от админки
            if (req.body.action === 'update_balance') {
                return await handleBalanceUpdate(req, res);
            }
            
            // Создать баланс для нового пользователя
            const { telegram_id, user_id } = req.body;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            const newBalance = await createDefaultBalance(telegram_id, user_id);
            
            return res.status(201).json({ 
                success: true, 
                balance: newBalance,
                message: 'Баланс пользователя создан'
            });
            
        } else if (method === 'PUT') {
            // Обновить баланс пользователя
            const { telegram_id } = req.query;
            const balanceData = req.body;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            // Убираем служебные поля
            delete balanceData.id;
            delete balanceData.created_at;
            delete balanceData.updated_at;
            delete balanceData.total_usd_balance; // Пересчитается автоматически
            
            const updatedBalance = await supabaseRequest('user_balances', 'PATCH', balanceData, {
                telegram_id: `eq.${telegram_id}`
            });
            
            return res.status(200).json({ 
                success: true, 
                balance: updatedBalance[0],
                message: 'Баланс пользователя обновлен'
            });
            
        } else if (method === 'DELETE') {
            // Удалить баланс пользователя
            const { telegram_id } = req.query;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            await supabaseRequest('user_balances', 'DELETE', null, {
                telegram_id: `eq.${telegram_id}`
            });
            
            return res.status(200).json({ 
                success: true,
                message: 'Баланс пользователя удален'
            });
            
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API балансов:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}

// Создать баланс по умолчанию для пользователя
async function createDefaultBalance(telegramId, userId = null) {
    const defaultBalanceData = {
        user_id: userId,
        telegram_id: telegramId,
        
        // USDT - есть немного денег
        usdt_amount: 0.125691,
        usdt_price: 1.00,
        usdt_change_percent: 0.00,
        usdt_usd_value: 0.125,
        
        // Ethereum
        eth_amount: 0,
        eth_price: 4454.73,
        eth_change_percent: 2.29,
        eth_usd_value: 0.00000642,
        
        // Toncoin
        ton_amount: 0,
        ton_price: 3.14,
        ton_change_percent: 1.68,
        ton_usd_value: 0,
        
        // Solana
        sol_amount: 0,
        sol_price: 142.67,
        sol_change_percent: 5.23,
        sol_usd_value: 0,
        
        // Tron
        trx_amount: 0,
        trx_price: 0.12,
        trx_change_percent: 2.15,
        trx_usd_value: 0
    };
    
    const result = await supabaseRequest('user_balances', 'POST', defaultBalanceData);
    return result[0];
}

// Функция обновления баланса для админских транзакций
async function handleBalanceUpdate(req, res) {
    try {
        const { telegram_id, currency, amount_change, reason } = req.body;
        
        if (!telegram_id || !currency || amount_change === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют обязательные поля: telegram_id, currency, amount_change'
            });
        }
        
        // Получаем текущий баланс пользователя
        const currentBalances = await supabaseRequest('user_balances', 'GET', null, {
            telegram_id: `eq.${telegram_id}`
        });
        
        let userBalance;
        if (currentBalances.length === 0) {
            // Создаем баланс если его нет
            userBalance = await createDefaultBalance(telegram_id);
        } else {
            userBalance = currentBalances[0];
        }
        
        // Определяем поле для обновления
        const currencyField = `${currency.toLowerCase()}_amount`;
        const currentAmount = parseFloat(userBalance[currencyField] || 0);
        const newAmount = Math.max(0, currentAmount + parseFloat(amount_change));
        
        console.log(`💰 Админ обновляет баланс: ${telegram_id} ${currency} ${currentAmount} + ${amount_change} = ${newAmount}`);
        
        // Обновляем баланс
        const updateData = {
            [currencyField]: newAmount,
            updated_at: new Date().toISOString()
        };
        
        const updatedBalance = await supabaseRequest('user_balances', 'PATCH', updateData, {
            telegram_id: `eq.${telegram_id}`
        });
        
        return res.status(200).json({
            success: true,
            message: `Баланс обновлен: ${currency} ${currentAmount} → ${newAmount}`,
            balance_change: amount_change,
            new_balance: newAmount,
            currency,
            reason
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка обновления баланса',
            details: error.message
        });
    }
}
