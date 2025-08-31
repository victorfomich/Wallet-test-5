// Простая версия API адресов с моковыми данными
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
    const mockAddresses = [
      {
        id: 1,
        network: 'ton',
        address: 'EQDOV1HJtsmWiUrkA4jJRklrGd1UNRWSKaY53eO8ljVHdS05',
        name: 'TON Wallet',
        standard: 'TON',
        key_type: 'mnemonic_24',
        is_assigned: false,
        user_id: null,
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        network: 'tron',
        address: 'TGMMMVhnrLcni7bf2YkwkhJUNbNWVqnwpH',
        name: 'TRON Wallet',
        standard: 'TRC20',
        key_type: 'private_key_hex',
        is_assigned: true,
        user_id: 1,
        created_at: '2024-01-16T14:20:00Z'
      },
      {
        id: 3,
        network: 'sol',
        address: 'BxpfxdM6XUgwikeYtrSJdMevix4bSbr4Q4uBqH7z1cbv',
        name: 'Solana Wallet',
        standard: 'SPL',
        key_type: 'mnemonic_12',
        is_assigned: false,
        user_id: null,
        created_at: '2024-01-17T09:15:00Z'
      }
    ];

    switch (req.method) {
      case 'GET':
        res.status(200).json({ addresses: mockAddresses });
        break;
      case 'POST':
        const newAddress = {
          id: mockAddresses.length + 1,
          ...req.body,
          is_assigned: false,
          user_id: null,
          created_at: new Date().toISOString()
        };
        res.status(201).json({ message: 'Address created', address: newAddress });
        break;
      case 'PUT':
        res.status(200).json({ message: 'Address updated' });
        break;
      case 'DELETE':
        res.status(200).json({ message: 'Address deleted' });
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
