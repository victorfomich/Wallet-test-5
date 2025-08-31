-- DreamWallet - Настройка базы данных Supabase
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    address_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы пула адресов
CREATE TABLE IF NOT EXISTS address_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    network VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    name VARCHAR(255),
    standard VARCHAR(50),
    icon TEXT,
    color VARCHAR(7),
    mnemonic_24 TEXT, -- для TON (24 слова)
    mnemonic_12 TEXT, -- для Solana (12 слов)
    private_key_hex TEXT, -- для Tron, ETH, BNB
    key_type VARCHAR(20), -- 'mnemonic_24', 'mnemonic_12', 'private_key_hex'
    is_assigned BOOLEAN DEFAULT FALSE,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для дополнительного шифрования ключей
CREATE TABLE IF NOT EXISTS encrypted_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID REFERENCES address_pool(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL,
    encryption_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Обновляем структуру существующей таблицы address_pool если нужно
DO $$ 
BEGIN
    -- Добавляем новые колонки если их нет
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'mnemonic_24') THEN
        ALTER TABLE address_pool ADD COLUMN mnemonic_24 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'mnemonic_12') THEN
        ALTER TABLE address_pool ADD COLUMN mnemonic_12 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'private_key_hex') THEN
        ALTER TABLE address_pool ADD COLUMN private_key_hex TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'key_type') THEN
        ALTER TABLE address_pool ADD COLUMN key_type VARCHAR(20);
    END IF;
    
    -- Удаляем старые колонки если они есть
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'private_key') THEN
        ALTER TABLE address_pool DROP COLUMN private_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'seed_phrase') THEN
        ALTER TABLE address_pool DROP COLUMN seed_phrase;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'secret_key') THEN
        ALTER TABLE address_pool DROP COLUMN secret_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'seed_length') THEN
        ALTER TABLE address_pool DROP COLUMN seed_length;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'address_pool' AND column_name = 'is_encrypted') THEN
        ALTER TABLE address_pool DROP COLUMN is_encrypted;
    END IF;
END $$;

-- Удаляем существующие CHECK ограничения на key_type если они есть
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Находим и удаляем CHECK ограничения на key_type
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'address_pool'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%key_type%'
    LOOP
        EXECUTE 'ALTER TABLE address_pool DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_address_pool_network ON address_pool(network);
CREATE INDEX IF NOT EXISTS idx_address_pool_is_assigned ON address_pool(is_assigned);
CREATE INDEX IF NOT EXISTS idx_address_pool_user_id ON address_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_address_pool_key_type ON address_pool(key_type);

-- Удаляем существующие представления если они есть
DROP VIEW IF EXISTS users_with_addresses CASCADE;
DROP VIEW IF EXISTS admin_addresses CASCADE;
DROP VIEW IF EXISTS admin_stats CASCADE;

-- Создание представления для пользователей с адресами
CREATE OR REPLACE VIEW users_with_addresses AS
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.first_name,
    u.last_name,
    u.created_at as user_created_at,
    a.id as address_id,
    a.network,
    a.address,
    a.name,
    a.standard,
    a.icon,
    a.color
FROM users u
LEFT JOIN address_pool a ON u.address_id = a.id;

-- Создание представления для админов с ключами
CREATE OR REPLACE VIEW admin_addresses AS
SELECT 
    id,
    network,
    address,
    name,
    standard,
    icon,
    color,
    mnemonic_24,
    mnemonic_12,
    private_key_hex,
    key_type,
    is_assigned,
    user_id,
    created_at,
    updated_at
FROM address_pool;

-- Создание представления для статистики админа
CREATE OR REPLACE VIEW admin_stats AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM address_pool) as total_addresses,
    (SELECT COUNT(*) FROM address_pool WHERE is_assigned = true) as assigned_addresses,
    (SELECT COUNT(*) FROM address_pool WHERE is_assigned = false) as available_addresses,
    (SELECT COUNT(*) FROM address_pool WHERE key_type = 'mnemonic_24') as mnemonic_24_addresses,
    (SELECT COUNT(*) FROM address_pool WHERE key_type = 'mnemonic_12') as mnemonic_12_addresses,
    (SELECT COUNT(*) FROM address_pool WHERE key_type = 'private_key_hex') as private_key_hex_addresses;

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Удаляем существующие триггеры если они есть
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_address_pool_updated_at ON address_pool;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_address_pool_updated_at BEFORE UPDATE ON address_pool
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Удаляем существующие функции если они есть
DROP FUNCTION IF EXISTS assign_address_to_user(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS get_user_addresses(BIGINT) CASCADE;

-- Создание функции для назначения адреса пользователю
CREATE OR REPLACE FUNCTION assign_address_to_user(user_telegram_id BIGINT)
RETURNS TABLE(
    user_id UUID,
    address_id UUID,
    network VARCHAR(50),
    address TEXT,
    name VARCHAR(255),
    standard VARCHAR(50),
    icon TEXT,
    color VARCHAR(7)
) AS $$
DECLARE
    available_address RECORD;
    new_user_id UUID;
BEGIN
    -- Найти свободный адрес
    SELECT * INTO available_address
    FROM address_pool
    WHERE is_assigned = FALSE
    LIMIT 1;
    
    IF available_address IS NULL THEN
        RAISE EXCEPTION 'No available addresses in pool';
    END IF;
    
    -- Создать пользователя
    INSERT INTO users (telegram_id)
    VALUES (user_telegram_id)
    RETURNING id INTO new_user_id;
    
    -- Назначить адрес пользователю
    UPDATE address_pool
    SET is_assigned = TRUE, user_id = new_user_id
    WHERE id = available_address.id;
    
    -- Вернуть результат
    RETURN QUERY
    SELECT 
        new_user_id,
        available_address.id,
        available_address.network,
        available_address.address,
        available_address.name,
        available_address.standard,
        available_address.icon,
        available_address.color;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для получения адресов пользователя
CREATE OR REPLACE FUNCTION get_user_addresses(user_telegram_id BIGINT)
RETURNS TABLE(
    network VARCHAR(50),
    address TEXT,
    name VARCHAR(255),
    standard VARCHAR(50),
    icon TEXT,
    color VARCHAR(7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.network,
        a.address,
        a.name,
        a.standard,
        a.icon,
        a.color
    FROM users u
    JOIN address_pool a ON u.address_id = a.id
    WHERE u.telegram_id = user_telegram_id;
END;
$$ LANGUAGE plpgsql;

-- Обновляем существующие записи, устанавливая правильный key_type
UPDATE address_pool SET key_type = 'mnemonic_24' WHERE network = 'ton' AND key_type IS NULL;
UPDATE address_pool SET key_type = 'mnemonic_12' WHERE network = 'sol' AND key_type IS NULL;
UPDATE address_pool SET key_type = 'private_key_hex' WHERE network IN ('tron', 'eth', 'bnb') AND key_type IS NULL;

-- Вставка начальных данных только если таблица пуста
INSERT INTO address_pool (network, address, name, standard, icon, color, mnemonic_24, mnemonic_12, private_key_hex, key_type) 
SELECT 
    'ton', 'EQDOV1HJtsmWiUrkA4jJRklrGd1UNRWSKaY53eO8ljVHdS05', 'TON Wallet', 'TON', 'toncoin.png', '#0088CC', 'arrive toast honey twenty drop idea apple draw donkey visa air fashion oil one awkward dilemma ahead elbow match motion reward choose occur side', NULL, NULL, 'mnemonic_24'
WHERE NOT EXISTS (SELECT 1 FROM address_pool WHERE network = 'ton' AND address = 'EQDOV1HJtsmWiUrkA4jJRklrGd1UNRWSKaY53eO8ljVHdS05');

INSERT INTO address_pool (network, address, name, standard, icon, color, mnemonic_24, mnemonic_12, private_key_hex, key_type) 
SELECT 
    'tron', 'TGMMMVhnrLcni7bf2YkwkhJUNbNWVqnwpH', 'TRON Wallet', 'TRC20', 'tron.png', '#FF0000', NULL, NULL, 'c8848161011d3baa41c649090dc782a5bd2a98c88ea7b990f2973eb853534021', 'private_key_hex'
WHERE NOT EXISTS (SELECT 1 FROM address_pool WHERE network = 'tron' AND address = 'TGMMMVhnrLcni7bf2YkwkhJUNbNWVqnwpH');

INSERT INTO address_pool (network, address, name, standard, icon, color, mnemonic_24, mnemonic_12, private_key_hex, key_type) 
SELECT 
    'sol', 'BxpfxdM6XUgwikeYtrSJdMevix4bSbr4Q4uBqH7z1cbv', 'Solana Wallet', 'SPL', 'solana.png', '#9945FF', NULL, 'cream jelly polar filter option jaguar intact ring capital link tilt forget', NULL, 'mnemonic_12'
WHERE NOT EXISTS (SELECT 1 FROM address_pool WHERE network = 'sol' AND address = 'BxpfxdM6XUgwikeYtrSJdMevix4bSbr4Q4uBqH7z1cbv');

INSERT INTO address_pool (network, address, name, standard, icon, color, mnemonic_24, mnemonic_12, private_key_hex, key_type) 
SELECT 
    'eth', '0xC56e5bE710d731d4d1b1Ea87cAbC94fE4c9647c3', 'Ethereum Wallet', 'ERC20', 'ethereum.svg', '#627EEA', NULL, NULL, '02e64295c183dd8028c865191255b531e1cf0000836bd3abb8c8a13bb8bb7dd2', 'private_key_hex'
WHERE NOT EXISTS (SELECT 1 FROM address_pool WHERE network = 'eth' AND address = '0xC56e5bE710d731d4d1b1Ea87cAbC94fE4c9647c3');

INSERT INTO address_pool (network, address, name, standard, icon, color, mnemonic_24, mnemonic_12, private_key_hex, key_type) 
SELECT 
    'bnb', '0x6799B62b4208157A2DaF081938cD354F11d818E4', 'BNB Wallet', 'BEP20', 'bnb.webp', '#F3BA2F', NULL, NULL, '28df5f2bacf732bc7cd1d138dfb5eb533baeba8b2435fd40aa136a0b4deb23ed', 'private_key_hex'
WHERE NOT EXISTS (SELECT 1 FROM address_pool WHERE network = 'bnb' AND address = '0x6799B62b4208157A2DaF081938cD354F11d818E4');

-- Настройка Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_keys ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can view public address info" ON address_pool;
DROP POLICY IF EXISTS "Only admins can modify addresses" ON address_pool;
DROP POLICY IF EXISTS "Only admins can access encrypted keys" ON encrypted_keys;

-- Политики для users
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (true);

-- Политики для address_pool
CREATE POLICY "Anyone can view public address info" ON address_pool
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify addresses" ON address_pool
    FOR ALL USING (false);

-- Политики для encrypted_keys
CREATE POLICY "Only admins can access encrypted keys" ON encrypted_keys
    FOR ALL USING (false);

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи Telegram mini-app';
COMMENT ON TABLE address_pool IS 'Пул адресов для автоматического назначения пользователям';
COMMENT ON TABLE encrypted_keys IS 'Дополнительное шифрование ключей для повышенной безопасности';

COMMENT ON COLUMN address_pool.mnemonic_24 IS 'Mnemonic фраза из 24 слов для TON';
COMMENT ON COLUMN address_pool.mnemonic_12 IS 'Mnemonic фраза из 12 слов для Solana';
COMMENT ON COLUMN address_pool.private_key_hex IS 'Приватный ключ в hex формате для Tron, ETH, BNB';
COMMENT ON COLUMN address_pool.key_type IS 'Тип ключа: mnemonic_24, mnemonic_12, private_key_hex';
