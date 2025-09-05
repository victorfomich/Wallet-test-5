// API для управления конкретным пользователем
import { supabaseRequest } from '../../../lib/supabase.js';

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { userId, action } = req.query;
        const { method } = req;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'Отсутствует userId' 
            });
        }
        
        if (method === 'GET') {
            // Получить конкретного пользователя
            const users = await supabaseRequest('users', 'GET', null, {
                id: `eq.${userId}`
            });
            
            if (users.length === 0) {
                return res.status(404).json({ 
                    error: 'Пользователь не найден' 
                });
            }
            
            return res.status(200).json({ 
                success: true, 
                user: users[0] 
            });
            
        } else if (method === 'DELETE') {
            // Удалить пользователя
            const users = await supabaseRequest('users', 'GET', null, {
                id: `eq.${userId}`
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
                id: `eq.${userId}`
            });
            
            return res.status(200).json({ 
                success: true, 
                message: 'Пользователь успешно удален' 
            });
            
        } else if (method === 'POST' && (action === 'reset' || req.body?.action === 'reset')) {
            // Сброс адресов пользователя (объединено, чтобы не расходовать слот функции)
            const users = await supabaseRequest('users', 'GET', null, { id: `eq.${userId}` });
            if (users.length === 0) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            const user = users[0];
            if (user.address_set_id) {
                await supabaseRequest('address_sets', 'PATCH', {
                    is_used: false,
                    assigned_to_telegram_id: null,
                    assigned_at: null
                }, { id: `eq.${user.address_set_id}` });
            }
            await supabaseRequest('users', 'PATCH', { address_set_id: null, updated_at: new Date().toISOString() }, { id: `eq.${userId}` });
            return res.status(200).json({ success: true, message: 'Адреса пользователя успешно сброшены' });
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API пользователя:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
