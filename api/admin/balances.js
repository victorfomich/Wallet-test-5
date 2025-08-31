// API для управления балансами пользователей
import { supabaseRequest } from '../supabase.js';

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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
                
                if (balances.length === 0) {
                    // Создаем баланс по умолчанию для нового пользователя
                    const defaultBalance = await createDefaultBalance(telegram_id);
                    return res.status(200).json({ 
                        success: true, 
                        balance: defaultBalance 
                    });
                }
                
                return res.status(200).json({ 
                    success: true, 
                    balance: balances[0] 
                });
                
            } else {
                // Получить все балансы с информацией о пользователях
                const query = `
                    user_balances!inner(
                        *,
                        users!inner(telegram_id, first_name, last_name, username)
                    )
                `;
                
                try {
                    const response = await fetch(
                        `https://qvinjcaarnmafqdtfzrf.supabase.co/rest/v1/user_balances?select=*,users!inner(telegram_id,first_name,last_name,username)`,
                        {
                            headers: {
                                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDkyNzQsImV4cCI6MjA3MjIyNTI3NH0.n5yfMg4yrjYUNZ2-J2rJzLT-6qF4hOnS7U0L9qgf3Yo',
                                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0OTI3NCwiZXhwIjoyMDcyMjI1Mjc0fQ.zL83Oek15xysWDm52AnDVwNQfz8cqX4dA0SyHOwTVAE`
                            }
                        }
                    );
                    
                    const balances = await response.json();
                    
                    return res.status(200).json({ 
                        success: true, 
                        balances: balances || [] 
                    });
                    
                } catch (error) {
                    console.error('Ошибка получения балансов:', error);
                    // Fallback - получаем простой список балансов
                    const balances = await supabaseRequest('user_balances', 'GET');
                    return res.status(200).json({ 
                        success: true, 
                        balances: balances || [] 
                    });
                }
            }
            
        } else if (method === 'POST') {
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
