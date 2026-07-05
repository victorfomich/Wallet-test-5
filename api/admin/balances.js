// API для управления балансами пользователей
import { supabaseRequest } from '../../lib/supabase.js';
import { getLivePrices, applyLivePricesToBalance } from '../../lib/prices.js';

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

                // НЕ пересчитываем по транзакциям: используем значения из user_balances
                // Только накладываем live-цены и считаем total_usd_balance
                try {
                    const live = await getLivePrices();
                    if (live) {
                        userBalance = applyLivePricesToBalance(userBalance, live);
                    }
                } catch (e) {
                    console.warn('Live price overlay failed:', e.message);
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
                    const live = await getLivePrices();
                    
                    // Объединяем данные + наслаиваем единые live-цены, не изменяя БД
                    const balancesWithUsers = finalBalances.map(balance => {
                        const user = users.find(u => u.telegram_id === balance.telegram_id);
                        const view = live ? applyLivePricesToBalance(balance, live) : { ...balance };
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
            let balanceWithPrices = newBalance;
            try {
                const live = await getLivePrices();
                if (live) balanceWithPrices = applyLivePricesToBalance(newBalance, live);
            } catch {}
            
            return res.status(201).json({ 
                success: true, 
                balance: balanceWithPrices,
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
        
        // Все балансы начинаются с 0
        usdt_amount: 0,
        eth_amount: 0,
        ton_amount: 0,
        sol_amount: 0,
        trx_amount: 0,
        
        // Временные метки
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    console.log(`💳 Создание баланса для пользователя ${telegramId}`);
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
