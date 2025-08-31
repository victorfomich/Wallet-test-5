// API для управления транзакциями кошелька в админке
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
            
        } else if (method === 'PUT') {
            // Обновить статус транзакции
            const { id } = req.query;
            const { transaction_status, blockchain_hash, admin_note } = req.body;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует ID транзакции' 
                });
            }
            
            const updateData = {
                updated_timestamp: new Date().toISOString()
            };
            
            if (transaction_status) updateData.transaction_status = transaction_status;
            if (blockchain_hash) updateData.blockchain_hash = blockchain_hash;
            
            const updatedTransaction = await supabaseRequest('wallet_transactions', 'PATCH', updateData, {
                id: `eq.${id}`
            });
            
            return res.status(200).json({ 
                success: true, 
                transaction: updatedTransaction[0],
                message: 'Транзакция обновлена'
            });
            
        } else if (method === 'DELETE') {
            // Удалить транзакцию (только для критических случаев)
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
        console.error('Ошибка API транзакций кошелька:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
