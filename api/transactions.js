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
        
        if (method === 'GET' && req.query.admin !== 'true') {
            // Получить транзакции пользователя
            const { telegram_id } = req.query;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            // Получаем транзакции из новой таблицы wallet_transactions
            const transactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                user_telegram_id: `eq.${telegram_id}`,
                order: 'created_timestamp.desc'
            });
            
            return res.status(200).json({ 
                success: true, 
                transactions: transactions || [] 
            });
            
        } else if (method === 'POST') {
            // Проверяем если это админская транзакция
            if (req.body.action === 'add_admin_transaction') {
                return await handleAdminTransaction(req, res);
            }
            
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
            
            // Создаем транзакцию в новой таблице wallet_transactions
            const transactionData = {
                user_telegram_id: parseInt(telegram_id),
                transaction_type: type,
                crypto_currency: crypto.toUpperCase(),
                blockchain_network: network.toLowerCase(),
                withdraw_amount: parseFloat(amount),
                network_fee: parseFloat(fee),
                recipient_address: address.trim(),
                user_comment: comment ? comment.trim() : null,
                transaction_status: 'pending'
            };
            
            const newTransaction = await supabaseRequest('wallet_transactions', 'POST', transactionData);
            
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
            // Обновить поля транзакции (для админки)
            const { id } = req.query;
            const { 
                status, 
                tx_hash,
                type, // deposit | withdraw
                amount, // withdraw_amount
                fee, // network_fee
                address, // recipient_address
                crypto, // crypto_currency
                network, // blockchain_network
                created_timestamp // ISO string
            } = req.body;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует ID транзакции' 
                });
            }
            
            const updateData = {
                updated_timestamp: new Date().toISOString()
            };
            
            if (status) updateData.transaction_status = status;
            if (tx_hash) updateData.blockchain_hash = tx_hash;
            if (type) updateData.transaction_type = type;
            if (amount !== undefined) updateData.withdraw_amount = parseFloat(amount);
            if (fee !== undefined) updateData.network_fee = parseFloat(fee);
            if (address) updateData.recipient_address = address.trim();
            if (crypto) updateData.crypto_currency = crypto.toUpperCase();
            if (network) updateData.blockchain_network = network.toLowerCase();
            if (created_timestamp) {
                const date = new Date(created_timestamp);
                if (!isNaN(date.getTime())) {
                    updateData.created_timestamp = date.toISOString();
                }
            }
            
            const updatedTransaction = await supabaseRequest('wallet_transactions', 'PATCH', updateData, {
                id: `eq.${id}`
            });
            
            return res.status(200).json({ 
                success: true, 
                transaction: updatedTransaction[0],
                message: 'Транзакция обновлена'
            });
            
        } else if (method === 'GET' && req.query.admin === 'true') {
            // АДМИНКА: Получить все транзакции для админки
            const { transaction_id, user_telegram_id, limit = 50 } = req.query;
            
            if (transaction_id) {
                // Получить конкретную транзакцию
                const transaction = await supabaseRequest('wallet_transactions', 'GET', null, {
                    id: `eq.${transaction_id}`
                });
                
                return res.status(200).json({ 
                    success: true, 
                    transaction: transaction[0] || null 
                });
                
            } else if (user_telegram_id) {
                // Получить транзакции конкретного пользователя
                const transactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                    user_telegram_id: `eq.${user_telegram_id}`,
                    order: 'created_timestamp.desc',
                    limit: limit
                });
                
                return res.status(200).json({ 
                    success: true, 
                    transactions: transactions || [] 
                });
                
            } else {
                // Получить все транзакции для админки
                try {
                    // Пытаемся получить транзакции с данными пользователей
                    const response = await fetch(
                        `https://qvinjcaarnmafqdtfzrf.supabase.co/rest/v1/wallet_transactions?select=*,users!inner(telegram_id,first_name,last_name,username)&order=created_timestamp.desc&limit=${limit}`,
                        {
                            headers: {
                                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDkyNzQsImV4cCI6MjA3MjIyNTI3NH0.n5yfMg4yrjYUNZ2-J2rJzLT-6qF4hOnS7U0L9qgf3Yo',
                                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0OTI3NCwiZXhwIjoyMDcyMjI1Mjc0fQ.zL83Oek15xysWDm52AnDVwNQfz8cqX4dA0SyHOwTVAE`
                            }
                        }
                    );
                    
                    if (response.ok) {
                        const transactions = await response.json();
                        return res.status(200).json({ 
                            success: true, 
                            transactions: transactions || [] 
                        });
                    }
                } catch (error) {
                    console.error('Ошибка получения транзакций с пользователями:', error);
                }
                
                // Fallback - получаем простой список транзакций
                const transactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                    order: 'created_timestamp.desc',
                    limit: limit
                });
                
                // Добавляем информацию о пользователях отдельно
                const users = await supabaseRequest('users', 'GET');
                const transactionsWithUsers = transactions.map(transaction => {
                    const user = users.find(u => u.telegram_id === transaction.user_telegram_id);
                    return {
                        ...transaction,
                        user_info: user || { telegram_id: transaction.user_telegram_id, first_name: 'Unknown User' }
                    };
                });
                
                return res.status(200).json({ 
                    success: true, 
                    transactions: transactionsWithUsers 
                });
            }
            
        } else if (method === 'DELETE' && req.query.admin === 'true') {
            // АДМИНКА: Удалить транзакцию (только для критических случаев)
            const { id } = req.query;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует ID транзакции' 
                });
            }
            
            await supabaseRequest('wallet_transactions', 'DELETE', null, {
                id: `eq.${id}`
            });
            
            return res.status(200).json({ 
                success: true,
                message: 'Транзакция удалена'
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

// Функция обработки админских транзакций
async function handleAdminTransaction(req, res) {
    try {
        const {
            user_telegram_id,
            transaction_type,
            crypto_currency,
            blockchain_network,
            withdraw_amount,
            network_fee = 0,
            recipient_address,
            blockchain_hash,
            transaction_status = 'completed',
            user_comment
        } = req.body;
        
        // Валидация обязательных полей
        if (!user_telegram_id || !transaction_type || !crypto_currency || 
            !blockchain_network || !withdraw_amount || !recipient_address) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют обязательные поля'
            });
        }
        
        if (withdraw_amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Сумма должна быть больше 0'
            });
        }
        
        if (!['deposit', 'withdraw'].includes(transaction_type)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип транзакции. Допустимы: deposit, withdraw'
            });
        }
        
        if (!['completed', 'pending', 'failed'].includes(transaction_status)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный статус транзакции. Допустимы: completed, pending, failed'
            });
        }
        
        // Генерируем хеш если не предоставлен
        const finalHash = blockchain_hash || `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Создаем транзакцию в wallet_transactions
        const transactionData = {
            user_telegram_id,
            transaction_type,
            crypto_currency: crypto_currency.toUpperCase(),
            blockchain_network: blockchain_network.toLowerCase(),
            withdraw_amount,
            network_fee,
            recipient_address,
            blockchain_hash: finalHash,
            transaction_status,
            user_comment: user_comment || `Админская транзакция (${transaction_type})`,
            created_timestamp: new Date().toISOString(),
            updated_timestamp: new Date().toISOString()
        };
        
        console.log(`🔧 Создаем админскую транзакцию (${transaction_status}):`, transactionData);
        
        const newTransaction = await supabaseRequest('wallet_transactions', 'POST', transactionData);
        
        if (!newTransaction || newTransaction.length === 0) {
            throw new Error('Ошибка создания транзакции в базе данных');
        }
        
        console.log('✅ Админская транзакция создана:', newTransaction[0]);
        
        return res.status(200).json({
            success: true,
            message: 'Админская транзакция успешно создана',
            transaction: newTransaction[0],
            hash: finalHash
        });
        
    } catch (error) {
        console.error('❌ Ошибка создания админской транзакции:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка создания транзакции',
            details: error.message
        });
    }
}
