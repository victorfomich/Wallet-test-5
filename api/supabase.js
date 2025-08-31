import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Создаем клиент с service role key для полного доступа
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Создаем клиент с anon key для ограниченного доступа
export const supabaseAnon = createClient(
  supabaseUrl, 
  process.env.SUPABASE_ANON_KEY
);
