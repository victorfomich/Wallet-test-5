// API для работы с транзакциями
import { supabaseRequest } from './supabase.js';

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
            // Получить транзакции пользователя
            const { telegram_id } = req.query;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            // Ищем по user_id или telegram_id (в зависимости от структуры вашей таблицы)
            let transactions = await supabaseRequest('transactions', 'GET', null, {
                user_id: `eq.${telegram_id}`,
                order: 'created_at.desc'
            });
            
            // Если не найдено по user_id, попробуем по telegram_id
            if (!transactions || transactions.length === 0) {
                transactions = await supabaseRequest('transactions', 'GET', null, {
                    telegram_id: `eq.${telegram_id}`,
                    order: 'created_at.desc'
                });
            }
            
            return res.status(200).json({ 
                success: true, 
                transactions: transactions || [] 
            });
            
        } else if (method === 'POST') {
            // Создать новую транзакцию вывода
            const { 
                telegram_id, 
                type = 'withdraw',
                crypto = 'USDT', 
                network, 
                amount, 
                fee = 0,
                address, 
                comment = null 
            } = req.body;
            
            // Валидация
            if (!telegram_id || !network || !amount || !address) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля: telegram_id, network, amount, address' 
                });
            }
            
            if (amount <= 0) {
                return res.status(400).json({ 
                    error: 'Сумма должна быть больше 0' 
                });
            }
            
            // Проверяем баланс пользователя
            const userBalances = await supabaseRequest('user_balances', 'GET', null, {
                telegram_id: `eq.${telegram_id}`
            });
            
            if (!userBalances || userBalances.length === 0) {
                return res.status(400).json({ 
                    error: 'Баланс пользователя не найден' 
                });
            }
            
            const balance = userBalances[0];
            const currentBalance = balance[`${crypto.toLowerCase()}_amount`] || 0;
            
            if (currentBalance < amount) {
                return res.status(400).json({ 
                    error: `Недостаточно средств. Баланс: ${currentBalance} ${crypto}, запрошено: ${amount} ${crypto}` 
                });
            }
            
            // Создаем транзакцию (совместимо с вашей таблицей)
            const transactionData = {
                user_id: parseInt(telegram_id), // основной ID в вашей таблице
                telegram_id: parseInt(telegram_id), // дополнительно для совместимости
                type,
                currency: crypto.toUpperCase(), // ваше поле currency
                network: network.toLowerCase(),
                amount: parseFloat(amount),
                fee: parseFloat(fee), // если поле добавлено
                address: address.trim(), // если поле добавлено
                comment: comment ? comment.trim() : null, // если поле добавлено
                status: 'pending'
            };
            
            const newTransaction = await supabaseRequest('transactions', 'POST', transactionData);
            
            if (!newTransaction || newTransaction.length === 0) {
                throw new Error('Ошибка создания транзакции');
            }
            
            // Обновляем баланс пользователя (вычитаем сумму)
            const newBalance = currentBalance - amount;
            const updateBalanceData = {
                [`${crypto.toLowerCase()}_amount`]: newBalance,
                updated_at: new Date().toISOString()
            };
            
            await supabaseRequest('user_balances', 'PATCH', updateBalanceData, {
                telegram_id: `eq.${telegram_id}`
            });
            
            console.log(`✅ ТРАНЗАКЦИЯ СОЗДАНА: ${amount} ${crypto} -> ${address} (${network})`);
            console.log(`💰 БАЛАНС ОБНОВЛЕН: ${currentBalance} -> ${newBalance} ${crypto}`);
            
            return res.status(201).json({ 
                success: true, 
                transaction: newTransaction[0],
                message: `Транзакция на вывод ${amount} ${crypto} создана`,
                new_balance: newBalance
            });
            
        } else if (method === 'PUT') {
            // Обновить статус транзакции (для админки)
            const { id } = req.query;
            const { status, tx_hash } = req.body;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует ID транзакции' 
                });
            }
            
            const updateData = {
                updated_at: new Date().toISOString()
            };
            
            if (status) updateData.status = status;
            if (tx_hash) updateData.tx_hash = tx_hash;
            
            const updatedTransaction = await supabaseRequest('transactions', 'PATCH', updateData, {
                id: `eq.${id}`
            });
            
            return res.status(200).json({ 
                success: true, 
                transaction: updatedTransaction[0],
                message: 'Транзакция обновлена'
            });
            
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API транзакций:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
