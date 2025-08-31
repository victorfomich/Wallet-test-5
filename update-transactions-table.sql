-- Добавление недостающих полей в таблицу transactions
-- Выполните этот SQL в Supabase SQL Editor

-- Добавляем поле для адреса получателя
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Добавляем поле для комментария пользователя  
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS comment TEXT;

-- Добавляем поле для комиссии
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS fee DECIMAL(20,8) DEFAULT 0;

-- Добавляем поле telegram_id (если его нет)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

-- Проверяем результат
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
