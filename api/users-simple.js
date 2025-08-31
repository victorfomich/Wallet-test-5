// Простая версия API пользователей с моковыми данными
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Моковые данные для тестирования
    const mockUsers = [
      {
        id: 1,
        telegram_id: '123456789',
        username: 'testuser1',
        first_name: 'Тест',
        last_name: 'Пользователь',
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        telegram_id: '987654321',
        username: 'testuser2',
        first_name: 'Второй',
        last_name: 'Тестер',
        created_at: '2024-01-16T14:20:00Z'
      }
    ];

    switch (req.method) {
      case 'GET':
        res.status(200).json({ users: mockUsers });
        break;
      case 'POST':
        const newUser = {
          id: mockUsers.length + 1,
          ...req.body,
          created_at: new Date().toISOString()
        };
        res.status(201).json({ message: 'User created', user: newUser });
        break;
      case 'PUT':
        res.status(200).json({ message: 'User updated' });
        break;
      case 'DELETE':
        res.status(200).json({ message: 'User deleted' });
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
