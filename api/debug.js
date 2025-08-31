// Диагностический endpoint для проверки настроек
export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Проверяем все переменные окружения
        const envStatus = {
            SUPABASE_URL: {
                exists: !!process.env.SUPABASE_URL,
                value: process.env.SUPABASE_URL ? 'Настроен' : 'НЕ НАСТРОЕН',
                preview: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'отсутствует'
            },
            SUPABASE_ANON_KEY: {
                exists: !!process.env.SUPABASE_ANON_KEY,
                value: process.env.SUPABASE_ANON_KEY ? 'Настроен' : 'НЕ НАСТРОЕН',
                preview: process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'отсутствует'
            },
            SUPABASE_SERVICE_KEY: {
                exists: !!process.env.SUPABASE_SERVICE_KEY,
                value: process.env.SUPABASE_SERVICE_KEY ? 'Настроен' : 'НЕ НАСТРОЕН',
                preview: process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...' : 'отсутствует'
            }
        };
        
        // Проверяем, можем ли подключиться к Supabase
        let connectionTest = null;
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            try {
                const testUrl = `${process.env.SUPABASE_URL}/rest/v1/address_sets?limit=1`;
                const testResponse = await fetch(testUrl, {
                    headers: {
                        'apikey': process.env.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                    }
                });
                
                connectionTest = {
                    success: testResponse.ok,
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    error: testResponse.ok ? null : await testResponse.text()
                };
            } catch (error) {
                connectionTest = {
                    success: false,
                    error: error.message
                };
            }
        } else {
            connectionTest = {
                success: false,
                error: 'Переменные окружения не настроены'
            };
        }
        
        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            variables: envStatus,
            connection_test: connectionTest,
            recommendations: getRecommendations(envStatus, connectionTest)
        });
        
    } catch (error) {
        console.error('Ошибка диагностики:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}

function getRecommendations(envStatus, connectionTest) {
    const recommendations = [];
    
    if (!envStatus.SUPABASE_URL.exists) {
        recommendations.push("Добавьте переменную SUPABASE_URL в настройки Vercel");
    }
    
    if (!envStatus.SUPABASE_ANON_KEY.exists) {
        recommendations.push("Добавьте переменную SUPABASE_ANON_KEY в настройки Vercel");
    }
    
    if (!envStatus.SUPABASE_SERVICE_KEY.exists) {
        recommendations.push("Добавьте переменную SUPABASE_SERVICE_KEY в настройки Vercel");
    }
    
    if (connectionTest && !connectionTest.success) {
        if (connectionTest.error?.includes('404')) {
            recommendations.push("Проверьте правильность URL Supabase проекта");
        } else if (connectionTest.error?.includes('401') || connectionTest.error?.includes('403')) {
            recommendations.push("Проверьте правильность ключей API Supabase");
        } else {
            recommendations.push("Проверьте подключение к интернету и доступность Supabase");
        }
    }
    
    if (recommendations.length === 0) {
        recommendations.push("Все настройки выглядят корректно!");
    }
    
    return recommendations;
}
