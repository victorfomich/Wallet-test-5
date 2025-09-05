// Конфигурация Supabase - ПРИНУДИТЕЛЬНО ИСПОЛЬЗУЕМ РАБОЧИЕ КЛЮЧИ
// Игнорируем переменные окружения чтобы точно работало
export const SUPABASE_URL = 'https://qvinjcaarnmafqdtfzrf.supabase.co';
export const SUPABASE_ANON_KEY = 'DEPRECATED_USE_/lib/supabase';
export const SUPABASE_SERVICE_KEY = 'DEPRECATED_USE_/lib/supabase';

// Ключи настроены принудительно - должно работать!

// Создаем клиент Supabase (для браузера используем анонимный ключ)
export function createSupabaseClient() { return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY }; }

// Функция для выполнения запросов к Supabase
export async function supabaseRequest(table, method = 'GET', data = null, params = {}) { throw new Error('Deprecated: use /lib/supabase'); }

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.createSupabaseClient = createSupabaseClient;
    window.supabaseRequest = supabaseRequest;
    window.SUPABASE_URL = SUPABASE_URL;
    window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
