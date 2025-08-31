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
        let databaseTest = null;
        
        // Импортируем конфигурацию с fallback значениями
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./supabase.js');
        
        if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
            try {
                // Тест подключения
                const testUrl = `${SUPABASE_URL}/rest/v1/address_sets?limit=1`;
                const testResponse = await fetch(testUrl, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                
                connectionTest = {
                    success: testResponse.ok,
                    status: testResponse.status,
                    statusText: testResponse.statusText,
                    error: testResponse.ok ? null : await testResponse.text()
                };
                
                // Тест данных в базе
                if (testResponse.ok) {
                    const data = await testResponse.json();
                    
                    // Проверяем количество доступных адресов
                    const countUrl = `${SUPABASE_URL}/rest/v1/address_sets?is_used=eq.false&select=count`;
                    const countResponse = await fetch(countUrl, {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Prefer': 'count=exact'
                        }
                    });
                    
                    databaseTest = {
                        tables_exist: true,
                        sample_data: data.length > 0,
                        available_addresses: countResponse.headers.get('content-range')?.split('/')[1] || 'unknown',
                        first_address_sample: data[0] || null
                    };
                }
                
            } catch (error) {
                connectionTest = {
                    success: false,
                    error: error.message
                };
            }
        } else {
            connectionTest = {
                success: false,
                error: SUPABASE_URL?.includes('YOUR_PROJECT_ID') ? 
                    'Используются заглушки ключей - замените на реальные в api/supabase.js' : 
                    'Ключи не настроены'
            };
        }
        
        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            variables: envStatus,
            connection_test: connectionTest,
            database_test: databaseTest,
            recommendations: getRecommendations(envStatus, connectionTest, databaseTest)
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

function getRecommendations(envStatus, connectionTest, databaseTest) {
    const recommendations = [];
    
    // Проверка заглушек
    if (connectionTest?.error?.includes('заглушки')) {
        recommendations.push("🔥 ВАЖНО: Замените заглушки в api/supabase.js на реальные ключи из вашего проекта Supabase");
        recommendations.push("📖 Следуйте инструкции в CREATE_SUPABASE_PROJECT.md");
        return recommendations;
    }
    
    // Проверка переменных окружения
    if (!envStatus.SUPABASE_URL.exists && !connectionTest?.success) {
        recommendations.push("Добавьте переменную SUPABASE_URL в настройки Vercel или замените заглушку в коде");
    }
    
    if (!envStatus.SUPABASE_ANON_KEY.exists && !connectionTest?.success) {
        recommendations.push("Добавьте переменную SUPABASE_ANON_KEY в настройки Vercel или замените заглушку в коде");
    }
    
    if (!envStatus.SUPABASE_SERVICE_KEY.exists) {
        recommendations.push("Добавьте переменную SUPABASE_SERVICE_KEY в настройки Vercel (нужна для админки)");
    }
    
    // Проверка подключения
    if (connectionTest && !connectionTest.success) {
        if (connectionTest.error?.includes('404')) {
            recommendations.push("Проверьте правильность URL Supabase проекта");
        } else if (connectionTest.error?.includes('401') || connectionTest.error?.includes('403')) {
            recommendations.push("Проверьте правильность ключей API Supabase");
        } else if (connectionTest.error?.includes('relation') || connectionTest.error?.includes('does not exist')) {
            recommendations.push("Выполните SQL скрипт supabase-setup-improved.sql в Supabase SQL Editor");
        } else {
            recommendations.push("Проверьте подключение к интернету и доступность Supabase");
        }
    }
    
    // Проверка данных в базе
    if (databaseTest) {
        if (!databaseTest.sample_data) {
            recommendations.push("В таблице address_sets нет данных. Выполните SQL скрипт с тестовыми данными");
        } else if (databaseTest.available_addresses === '0') {
            recommendations.push("Все адреса заняты! Добавьте больше адресов в таблицу address_sets");
        } else {
            recommendations.push(`✅ Отлично! Доступно ${databaseTest.available_addresses} адресов для пользователей`);
        }
    }
    
    if (recommendations.length === 0) {
        recommendations.push("🎉 Все настройки корректны! DreamWallet готов к работе!");
    }
    
    return recommendations;
}
