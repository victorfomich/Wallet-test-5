import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ycstgibupnihymetsmxc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljc3RnaWJ1cG5paHltZXRzbXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2Mzc0NzIsImV4cCI6MjA3MjIxMzQ3Mn0.g7v_NkzgQlRkWTKXjxjx5OrCK5QjY3kP8fj1TZo5S1o';

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
