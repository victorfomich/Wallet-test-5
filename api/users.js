import { supabase } from './supabase.js';

export default async function handler(req, res) {
  // Включаем CORS
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
        return await getUsers(req, res);
      case 'POST':
        return await createUser(req, res);
      case 'PUT':
        return await updateUser(req, res);
      case 'DELETE':
        return await deleteUser(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

// Получить всех пользователей
async function getUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ users: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Создать нового пользователя
async function createUser(req, res) {
  try {
    const { telegram_id, username, first_name, last_name } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    // Проверяем, существует ли уже пользователь
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (existingUser) {
      return res.status(200).json({ 
        message: 'User already exists', 
        user: existingUser 
      });
    }

    // Получаем свободный адрес из пула
    const { data: availableAddress } = await supabase
      .from('address_pool')
      .select('*')
      .eq('is_assigned', false)
      .limit(1)
      .single();

    if (!availableAddress) {
      return res.status(500).json({ error: 'No available addresses in pool' });
    }

    // Создаем пользователя
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        telegram_id,
        username,
        first_name,
        last_name,
        address_id: availableAddress.id
      }])
      .select()
      .single();

    if (userError) throw userError;

    // Помечаем адрес как назначенный
    const { error: addressError } = await supabase
      .from('address_pool')
      .update({ is_assigned: true, user_id: newUser.id })
      .eq('id', availableAddress.id);

    if (addressError) throw addressError;

    res.status(201).json({ 
      message: 'User created successfully', 
      user: newUser,
      addresses: availableAddress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Обновить пользователя
async function updateUser(req, res) {
  try {
    const { id } = req.query;
    const updateData = req.body;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ message: 'User updated successfully', user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Удалить пользователя
async function deleteUser(req, res) {
  try {
    const { id } = req.query;

    // Освобождаем адрес
    const { error: addressError } = await supabase
      .from('address_pool')
      .update({ is_assigned: false, user_id: null })
      .eq('user_id', id);

    if (addressError) throw addressError;

    // Удаляем пользователя
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
