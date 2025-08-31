import { supabase } from './supabase.js';

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await getAddresses(req, res);
        break;
      case 'POST':
        await createAddress(req, res);
        break;
      case 'PUT':
        await updateAddress(req, res);
        break;
      case 'DELETE':
        await deleteAddress(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Получение адресов
async function getAddresses(req, res) {
  try {
    const { admin } = req.query;

    if (admin === 'true') {
      // Для админов - полная информация с ключами
      const { data, error } = await supabase
        .from('address_pool')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ addresses: data });
    } else {
      // Для обычных пользователей - только публичная информация без ключей
      const { data, error } = await supabase
        .from('address_pool')
        .select(`
          id, network, address, name, standard, icon, color, is_assigned, created_at, updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ addresses: data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Создание нового адреса
async function createAddress(req, res) {
  try {
    const { 
      network, 
      address, 
      name, 
      standard, 
      icon, 
      color,
      mnemonic24, 
      mnemonic12, 
      privateKeyHex, 
      keyType 
    } = req.body;

    // Валидация обязательных полей
    if (!network || !address) {
      return res.status(400).json({ error: 'Network and address are required' });
    }

    // Автоматически определяем тип ключа если не указан
    let finalKeyType = keyType;
    if (!finalKeyType) {
      if (network === 'ton') finalKeyType = 'mnemonic_24';
      else if (network === 'sol') finalKeyType = 'mnemonic_12';
      else finalKeyType = 'private_key_hex';
    }

    // Валидация ключей в зависимости от типа
    if (finalKeyType === 'mnemonic_24' && !mnemonic24) {
      return res.status(400).json({ error: 'Mnemonic 24 words required for TON' });
    }
    if (finalKeyType === 'mnemonic_12' && !mnemonic12) {
      return res.status(400).json({ error: 'Mnemonic 12 words required for Solana' });
    }
    if (finalKeyType === 'private_key_hex' && !privateKeyHex) {
      return res.status(400).json({ error: 'Private key hex required for Tron, ETH, BNB' });
    }

    // Подготавливаем данные для вставки
    const addressData = {
      network,
      address,
      name: name || `${network.toUpperCase()} Wallet`,
      standard: standard || getStandard(network),
      icon: icon || getIcon(network),
      color: color || getColor(network),
      key_type: finalKeyType,
      mnemonic_24: mnemonic24 || null,
      mnemonic_12: mnemonic12 || null,
      private_key_hex: privateKeyHex || null,
      is_assigned: false
    };

    const { data, error } = await supabase
      .from('address_pool')
      .insert([addressData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Address created successfully', address: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Обновление адреса
async function updateAddress(req, res) {
  try {
    const { id } = req.query;
    const { 
      network, 
      address, 
      name, 
      standard, 
      icon, 
      color,
      mnemonic24, 
      mnemonic12, 
      privateKeyHex, 
      keyType 
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Address ID is required' });
    }

    // Проверяем, не назначен ли адрес пользователю
    const { data: existingAddress } = await supabase
      .from('address_pool')
      .select('is_assigned, user_id')
      .eq('id', id)
      .single();

    if (existingAddress?.is_assigned) {
      return res.status(400).json({ 
        error: 'Cannot modify assigned address. Unassign it first.' 
      });
    }

    // Подготавливаем данные для обновления
    const updateData = {};
    if (network) updateData.network = network;
    if (address) updateData.address = address;
    if (name) updateData.name = name;
    if (standard) updateData.standard = standard;
    if (icon) updateData.icon = icon;
    if (color) updateData.color = color;
    if (keyType) updateData.key_type = keyType;
    if (mnemonic24 !== undefined) updateData.mnemonic_24 = mnemonic24;
    if (mnemonic12 !== undefined) updateData.mnemonic_12 = mnemonic12;
    if (privateKeyHex !== undefined) updateData.private_key_hex = privateKeyHex;

    const { data, error } = await supabase
      .from('address_pool')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ message: 'Address updated successfully', address: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Удаление адреса
async function deleteAddress(req, res) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Address ID is required' });
    }

    // Проверяем, не назначен ли адрес пользователю
    const { data: existingAddress } = await supabase
      .from('address_pool')
      .select('is_assigned, user_id')
      .eq('id', id)
      .single();

    if (existingAddress?.is_assigned) {
      return res.status(400).json({ 
        error: 'Cannot delete assigned address. Unassign it first.' 
      });
    }

    const { error } = await supabase
      .from('address_pool')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Вспомогательные функции
function getStandard(network) {
  const standards = {
    'ton': 'TON',
    'tron': 'TRC20',
    'sol': 'SPL',
    'eth': 'ERC20',
    'bnb': 'BEP20'
  };
  return standards[network] || 'Unknown';
}

function getIcon(network) {
  const icons = {
    'ton': 'toncoin.png',
    'tron': 'tron.png',
    'sol': 'solana.png',
    'eth': 'ethereum.svg',
    'bnb': 'bnb.webp'
  };
  return icons[network] || 'default.png';
}

function getColor(network) {
  const colors = {
    'ton': '#0088CC',
    'tron': '#FF0000',
    'sol': '#9945FF',
    'eth': '#627EEA',
    'bnb': '#F3BA2F'
  };
  return colors[network] || '#000000';
}
