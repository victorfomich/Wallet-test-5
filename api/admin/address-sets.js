// API для админки - управление наборами адресов
import { getAllAddressSets, createAddressSet, updateAddressSet, deleteAddressSet } from '../users.js';
import { supabaseRequest } from '../../lib/supabase.js';

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
            // Получить все наборы адресов
            const addressSets = await getAllAddressSets();
            
            return res.status(200).json({ 
                success: true, 
                address_sets: addressSets 
            });
            
        } else if (method === 'POST') {
            // Создать новый набор адресов
            const { name, addresses, secrets = {} } = req.body;
            
            if (!name || !addresses) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля: name, addresses' 
                });
            }
            
            const newAddressSet = await createAddressSet(name, addresses, secrets);
            
            return res.status(201).json({ 
                success: true, 
                address_set: newAddressSet,
                message: 'Набор адресов успешно создан'
            });
            
        } else if (method === 'PUT') {
            // Обновить набор адресов
            const { id } = req.query;
            const { addresses, secrets = {} } = req.body;
            
            if (!id || !addresses) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля: id, addresses' 
                });
            }
            
            const updatedAddressSet = await updateAddressSet(id, addresses, secrets);
            
            return res.status(200).json({ 
                success: true, 
                address_set: updatedAddressSet,
                message: 'Набор адресов успешно обновлен'
            });
            
        } else if (method === 'DELETE') {
            // Удалить набор адресов
            const { id } = req.query;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует id' 
                });
            }
            
            // Проверяем, не используется ли набор адресов
            const addressSets = await supabaseRequest('address_sets', 'GET', null, {
                id: `eq.${id}`
            });
            
            if (addressSets.length === 0) {
                return res.status(404).json({ 
                    error: 'Набор адресов не найден' 
                });
            }
            
            const addressSet = addressSets[0];
            
            if (addressSet.is_used) {
                return res.status(400).json({ 
                    error: 'Нельзя удалить используемый набор адресов' 
                });
            }
            
            const success = await deleteAddressSet(id);
            
            if (success) {
                return res.status(200).json({ 
                    success: true,
                    message: 'Набор адресов успешно удален'
                });
            } else {
                throw new Error('Ошибка удаления набора адресов');
            }
            
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API админки наборов адресов:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}
