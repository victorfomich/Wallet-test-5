// Конфигурация Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Проверяем наличие переменных окружения
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Отсутствуют необходимые переменные окружения для Supabase');
}

// Создаем клиент Supabase (для браузера используем анонимный ключ)
function createSupabaseClient() {
    if (typeof window !== 'undefined') {
        // Клиентская сторона - используем анонимный ключ
        return {
            url: SUPABASE_URL,
            key: SUPABASE_ANON_KEY
        };
    } else {
        // Серверная сторона - используем сервисный ключ
        return {
            url: SUPABASE_URL,
            key: SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
        };
    }
}

// Функция для выполнения запросов к Supabase
async function supabaseRequest(table, method = 'GET', data = null, params = {}) {
    const client = createSupabaseClient();
    
    let url = `${client.url}/rest/v1/${table}`;
    
    // Добавляем параметры запроса
    if (method === 'GET' && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, value);
        });
        url += `?${searchParams.toString()}`;
    }
    
    const headers = {
        'apikey': client.key,
        'Authorization': `Bearer ${client.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    
    const options = {
        method,
        headers
    };
    
    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Supabase error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Ошибка запроса к Supabase:', error);
        throw error;
    }
}

// Экспорт функций
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createSupabaseClient,
        supabaseRequest,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    };
} else {
    // Для использования в браузере
    window.createSupabaseClient = createSupabaseClient;
    window.supabaseRequest = supabaseRequest;
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
