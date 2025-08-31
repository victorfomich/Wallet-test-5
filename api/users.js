// API для работы с пользователями и их адресами
import { supabaseRequest } from './supabase.js';

// Получить пользователя по Telegram ID
async function getUserByTelegramId(telegramId) {
    try {
        const result = await supabaseRequest('users', 'GET', null, {
            telegram_id: `eq.${telegramId}`,
            select: '*'
        });
        
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
}

// Создать нового пользователя
async function createUser(telegramId, firstName, lastName = null, username = null) {
    try {
        // Получаем следующий доступный набор адресов
        const nextAddressSet = await getNextAvailableAddressSet();
        
        if (!nextAddressSet) {
            throw new Error('Нет доступных наборов адресов');
        }
        
        const userData = {
            telegram_id: telegramId,
            first_name: firstName,
            last_name: lastName,
            username: username,
            address_set_id: nextAddressSet.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const result = await supabaseRequest('users', 'POST', userData);
        
        // Отмечаем набор адресов как занятый
        await markAddressSetAsUsed(nextAddressSet.id, telegramId);
        
        return result[0];
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        throw error;
    }
}

// Получить или создать пользователя
async function getOrCreateUser(telegramId, firstName, lastName = null, username = null) {
    try {
        // Сначала пытаемся найти существующего пользователя
        let user = await getUserByTelegramId(telegramId);
        
        if (!user) {
            // Если пользователь не найден, создаем нового
            user = await createUser(telegramId, firstName, lastName, username);
        } else {
            // Обновляем информацию о пользователе
            const updateData = {
                first_name: firstName,
                last_name: lastName,
                username: username,
                updated_at: new Date().toISOString()
            };
            
            const result = await supabaseRequest('users', 'PATCH', updateData, {
                telegram_id: `eq.${telegramId}`
            });
            
            user = result[0] || user;
        }
        
        return user;
    } catch (error) {
        console.error('Ошибка получения/создания пользователя:', error);
        throw error;
    }
}

// Получить адреса пользователя
async function getUserAddresses(userId) {
    try {
        const result = await supabaseRequest('user_addresses', 'GET', null, {
            user_id: `eq.${userId}`,
            select: '*'
        });
        
        return result;
    } catch (error) {
        console.error('Ошибка получения адресов пользователя:', error);
        return [];
    }
}

// Получить адреса пользователя по Telegram ID
async function getUserAddressesByTelegramId(telegramId) {
    try {
        const user = await getUserByTelegramId(telegramId);
        if (!user) {
            return [];
        }
        
        return await getUserAddresses(user.id);
    } catch (error) {
        console.error('Ошибка получения адресов пользователя по Telegram ID:', error);
        return [];
    }
}

// Получить следующий доступный набор адресов
async function getNextAvailableAddressSet() {
    try {
        const result = await supabaseRequest('address_sets', 'GET', null, {
            is_used: 'eq.false',
            order: 'id.asc',
            limit: '1'
        });
        
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        console.error('Ошибка получения доступного набора адресов:', error);
        return null;
    }
}

// Отметить набор адресов как использованный
async function markAddressSetAsUsed(addressSetId, telegramId) {
    try {
        const updateData = {
            is_used: true,
            assigned_to_telegram_id: telegramId,
            assigned_at: new Date().toISOString()
        };
        
        await supabaseRequest('address_sets', 'PATCH', updateData, {
            id: `eq.${addressSetId}`
        });
        
        return true;
    } catch (error) {
        console.error('Ошибка отметки набора адресов как использованного:', error);
        return false;
    }
}

// Получить все наборы адресов (для админки)
async function getAllAddressSets() {
    try {
        const result = await supabaseRequest('address_sets', 'GET', null, {
            order: 'id.asc'
        });
        
        return result;
    } catch (error) {
        console.error('Ошибка получения всех наборов адресов:', error);
        return [];
    }
}

// Получить всех пользователей (для админки)
async function getAllUsers() {
    try {
        const result = await supabaseRequest('users', 'GET', null, {
            order: 'created_at.desc'
        });
        
        return result;
    } catch (error) {
        console.error('Ошибка получения всех пользователей:', error);
        return [];
    }
}

// Создать набор адресов
async function createAddressSet(name, addresses) {
    try {
        const addressSetData = {
            name: name,
            ton_address: addresses.ton,
            tron_address: addresses.tron,
            sol_address: addresses.sol,
            eth_address: addresses.eth,
            bnb_address: addresses.bnb,
            is_used: false,
            created_at: new Date().toISOString()
        };
        
        const result = await supabaseRequest('address_sets', 'POST', addressSetData);
        
        return result[0];
    } catch (error) {
        console.error('Ошибка создания набора адресов:', error);
        throw error;
    }
}

// Обновить набор адресов
async function updateAddressSet(id, addresses) {
    try {
        const updateData = {
            ton_address: addresses.ton,
            tron_address: addresses.tron,
            sol_address: addresses.sol,
            eth_address: addresses.eth,
            bnb_address: addresses.bnb,
            updated_at: new Date().toISOString()
        };
        
        const result = await supabaseRequest('address_sets', 'PATCH', updateData, {
            id: `eq.${id}`
        });
        
        return result[0];
    } catch (error) {
        console.error('Ошибка обновления набора адресов:', error);
        throw error;
    }
}

// Удалить набор адресов
async function deleteAddressSet(id) {
    try {
        await supabaseRequest('address_sets', 'DELETE', null, {
            id: `eq.${id}`
        });
        
        return true;
    } catch (error) {
        console.error('Ошибка удаления набора адресов:', error);
        return false;
    }
}

export {
    getUserByTelegramId,
    createUser,
    getOrCreateUser,
    getUserAddresses,
    getUserAddressesByTelegramId,
    getNextAvailableAddressSet,
    markAddressSetAsUsed,
    getAllAddressSets,
    getAllUsers,
    createAddressSet,
    updateAddressSet,
    deleteAddressSet
};
