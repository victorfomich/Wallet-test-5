// Конфигурация Supabase - ПРИНУДИТЕЛЬНО ИСПОЛЬЗУЕМ РАБОЧИЕ КЛЮЧИ
// Игнорируем переменные окружения чтобы точно работало
export const SUPABASE_URL = 'https://qvinjcaarnmafqdtfzrf.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDkyNzQsImV4cCI6MjA3MjIyNTI3NH0.n5yfMg4yrjYUNZ2-J2rJzLT-6qF4hOnS7U0L9qgf3Yo';
export const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0OTI3NCwiZXhwIjoyMDcyMjI1Mjc0fQ.zL83Oek15xysWDm52AnDVwNQfz8cqX4dA0SyHOwTVAE';

// Ключи настроены принудительно - должно работать!

// Создаем клиент Supabase (для браузера используем анонимный ключ)
export function createSupabaseClient() {
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
export async function supabaseRequest(table, method = 'GET', data = null, params = {}) {
    const client = createSupabaseClient();
    
    let url = `${client.url}/rest/v1/${table}`;
    
    // Добавляем параметры запроса для всех методов кроме POST
    if (Object.keys(params).length > 0 && method !== 'POST') {
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

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.createSupabaseClient = createSupabaseClient;
    window.supabaseRequest = supabaseRequest;
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
