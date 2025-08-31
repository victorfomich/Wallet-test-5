// API endpoints для работы с адресами через Vercel
import { getUserByTelegramId, getOrCreateUser, getUserAddressesByTelegramId } from './users.js';

// Получить адреса пользователя по Telegram ID
export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { method } = req;
        
        if (method === 'GET') {
            // Получить адреса пользователя
            const { telegram_id } = req.query;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            const user = await getUserByTelegramId(telegram_id);
            
            if (!user) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }
            
            // Получаем адреса пользователя из его набора адресов
            const addresses = {
                ton: user.address_set?.ton_address || null,
                tron: user.address_set?.tron_address || null,
                sol: user.address_set?.sol_address || null,
                eth: user.address_set?.eth_address || null,
                bnb: user.address_set?.bnb_address || null
            };
            
            return res.status(200).json({ 
                success: true, 
                user: {
                    id: user.id,
                    telegram_id: user.telegram_id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username
                },
                addresses 
            });
            
        } else if (method === 'POST') {
            // Создать или обновить пользователя
            const { telegram_id, first_name, last_name, username } = req.body;
            
            if (!telegram_id || !first_name) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля: telegram_id, first_name' 
                });
            }
            
            const user = await getOrCreateUser(telegram_id, first_name, last_name, username);
            
            // Получаем адреса пользователя
            const addresses = await getUserAddressesByTelegramId(telegram_id);
            
            return res.status(200).json({ 
                success: true, 
                user: {
                    id: user.id,
                    telegram_id: user.telegram_id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username
                },
                addresses 
            });
            
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API адресов:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
