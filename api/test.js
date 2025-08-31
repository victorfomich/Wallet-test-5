// Простой тест API
export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        return res.status(200).json({ 
            success: true,
            message: 'API работает!',
            method: req.method,
            timestamp: new Date().toISOString(),
            env: {
                SUPABASE_URL: process.env.SUPABASE_URL ? 'Установлен' : 'НЕ установлен',
                SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Установлен' : 'НЕ установлен',
                SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Установлен' : 'НЕ установлен'
            }
        });
        
    } catch (error) {
        console.error('Ошибка тестового API:', error);
        return res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
