// API для админки - управление пользователями
import { getAllUsers, getUserByTelegramId, markAddressSetAsUsed } from '../users.js';
import { supabaseRequest } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { method } = req;
        
        if (method === 'GET') {
            // Получить всех пользователей
            const users = await getAllUsers();
            
            return res.status(200).json({ 
                success: true, 
                users 
            });
            
        } else if (method === 'DELETE') {
            // Удалить пользователя
            const { user_id } = req.query;
            
            if (!user_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует user_id' 
                });
            }
            
            // Получаем информацию о пользователе
            const users = await supabaseRequest('users', 'GET', null, {
                id: `eq.${user_id}`
            });
            
            if (users.length === 0) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }
            
            const user = users[0];
            
            // Освобождаем набор адресов
            if (user.address_set_id) {
                await supabaseRequest('address_sets', 'PATCH', {
                    is_used: false,
                    assigned_to_telegram_id: null,
                    assigned_at: null
                }, {
                    id: `eq.${user.address_set_id}`
                });
            }
            
            // Удаляем пользователя
            await supabaseRequest('users', 'DELETE', null, {
                id: `eq.${user_id}`
            });
            
            return res.status(200).json({ 
                success: true, 
                message: 'Пользователь успешно удален' 
            });
            
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API админки пользователей:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
