-- Исправление проблемы с RLS для таблицы withdraw_fees
-- Выполни этот SQL в Supabase SQL Editor

-- 1. Проверяем текущее состояние RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'withdraw_fees';

-- 2. Принудительно отключаем RLS для withdraw_fees
ALTER TABLE public.withdraw_fees DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем все существующие политики RLS (если есть)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.withdraw_fees;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.withdraw_fees;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.withdraw_fees;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.withdraw_fees;

-- 4. Проверяем что данные есть
SELECT * FROM public.withdraw_fees;

-- 5. Если пусто - заполняем заново
INSERT INTO public.withdraw_fees(network, fee) VALUES
  ('ton', 0.01),
  ('tron', 0),
  ('sol', 0.01),
  ('eth', 0.001),
  ('bnb', 0.01)
ON CONFLICT (network) DO UPDATE SET 
  fee = EXCLUDED.fee,
  updated_at = now();

-- 6. Финальная проверка
SELECT 
  'withdraw_fees' as table_name,
  COUNT(*) as row_count,
  array_agg(network ORDER BY network) as networks
FROM public.withdraw_fees;

-- 7. Проверяем что RLS отключен
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'RLS ВКЛЮЧЕН ❌' 
    ELSE 'RLS ОТКЛЮЧЕН ✅' 
  END as status
FROM pg_tables 
WHERE tablename = 'withdraw_fees';
