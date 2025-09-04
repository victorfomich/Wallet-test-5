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
        console.log(`Создаем пользователя ${telegramId}`);
        
        // Получаем первый доступный набор адресов
        const availableSets = await supabaseRequest('address_sets', 'GET', null, {
            is_used: 'eq.false',
            order: 'id.asc',
            limit: '1'
        });
        
        if (!availableSets || availableSets.length === 0) {
            throw new Error('Нет доступных наборов адресов');
        }
        
        const nextAddressSet = availableSets[0];
        console.log(`Найден доступный набор: ${nextAddressSet.id}`);
        
        // Сначала отмечаем набор как занятый
        await supabaseRequest('address_sets', 'PATCH', {
            is_used: true,
            assigned_to_telegram_id: telegramId,
            assigned_at: new Date().toISOString()
        }, {
            id: `eq.${nextAddressSet.id}`
        });
        
        console.log(`Набор ${nextAddressSet.id} помечен как занятый`);
        
        // Затем создаем пользователя
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
        console.log(`Пользователь создан с ID: ${result[0]?.id}`);
        
        // Создаем начальные балансы для пользователя
        const balanceData = {
            telegram_id: telegramId,
            // USDT - $1.00, 0 USDT, 0% изменения
            usdt_amount: 0,
            usdt_price: 1.00,
            usdt_change_percent: 0,
            usdt_usd_value: 0,
            // ETH - примерная цена $3000
            eth_amount: 0,
            eth_price: 3000.00,
            eth_change_percent: 0,
            eth_usd_value: 0,
            // TON - примерная цена $5
            ton_amount: 0,
            ton_price: 5.00,
            ton_change_percent: 0,
            ton_usd_value: 0,
            // SOL - примерная цена $150
            sol_amount: 0,
            sol_price: 150.00,
            sol_change_percent: 0,
            sol_usd_value: 0,
            // TRX - примерная цена $0.15
            trx_amount: 0,
            trx_price: 0.15,
            trx_change_percent: 0,
            trx_usd_value: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        await supabaseRequest('user_balances', 'POST', balanceData);
        console.log(`Начальные балансы созданы для пользователя ${telegramId}`);
        
        return result[0];
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        throw error;
    }
}

// Получить или создать пользователя
async function getOrCreateUser(telegramId, firstName, lastName = null, username = null) {
    try {
        console.log(`Поиск/создание пользователя: ${telegramId}`);
        
        // Сначала пытаемся найти существующего пользователя
        let user = await getUserByTelegramId(telegramId);
        console.log(`Пользователь найден:`, user ? 'Да' : 'Нет');
        
        if (!user) {
            // Если пользователь не найден, создаем нового
            console.log('Создаем нового пользователя...');
            user = await createUser(telegramId, firstName, lastName, username);
            console.log('Пользователь создан:', user);
        } else {
            console.log('Пользователь уже существует, обновляем данные...');
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
            console.log('Данные пользователя обновлены');
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
async function createAddressSet(name, addresses, secrets = {}) {
    try {
        const addressSetData = {
            name: name,
            ton_address: addresses.ton,
            tron_address: addresses.tron,
            sol_address: addresses.sol,
            eth_address: addresses.eth,
            bnb_address: addresses.bnb,
            ton_secret: secrets.ton || null,
            tron_secret: secrets.tron || null,
            sol_secret: secrets.sol || null,
            eth_secret: secrets.eth || null,
            bnb_secret: secrets.bnb || null,
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
async function updateAddressSet(id, addresses, secrets = {}) {
    try {
        const updateData = {
            ton_address: addresses.ton,
            tron_address: addresses.tron,
            sol_address: addresses.sol,
            eth_address: addresses.eth,
            bnb_address: addresses.bnb,
            ton_secret: secrets.ton,
            tron_secret: secrets.tron,
            sol_secret: secrets.sol,
            eth_secret: secrets.eth,
            bnb_secret: secrets.bnb,
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
