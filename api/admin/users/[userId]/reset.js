// API для сброса адресов пользователя по userId
import { supabaseRequest } from '../../../supabase.js';

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Метод не поддерживается' 
        });
    }
    
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'Отсутствует userId' 
            });
        }
        
        // Получаем информацию о пользователе
        const users = await supabaseRequest('users', 'GET', null, {
            id: `eq.${userId}`
        });
        
        if (users.length === 0) {
            return res.status(404).json({ 
                error: 'Пользователь не найден' 
            });
        }
        
        const user = users[0];
        
        // Освобождаем текущий набор адресов
        if (user.address_set_id) {
            await supabaseRequest('address_sets', 'PATCH', {
                is_used: false,
                assigned_to_telegram_id: null,
                assigned_at: null
            }, {
                id: `eq.${user.address_set_id}`
            });
        }
        
        // Убираем ссылку на набор адресов у пользователя
        await supabaseRequest('users', 'PATCH', {
            address_set_id: null,
            updated_at: new Date().toISOString()
        }, {
            id: `eq.${userId}`
        });
        
        return res.status(200).json({ 
            success: true,
            message: 'Адреса пользователя успешно сброшены'
        });
        
    } catch (error) {
        console.error('Ошибка сброса адресов пользователя:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
