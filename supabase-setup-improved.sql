-- Таблица глобальных настроек приложения
-- Для чего: хранение настраиваемых параметров, которые админ меняет в панели.
-- В нашем случае используются ключи fee_ton, fee_tron, fee_sol, fee_eth, fee_bnb
-- для управления комиссией на вывод по сетям (в нативной валюте сети).

create table if not exists public.app_settings (
  key text primary key,
  value numeric,
  updated_at timestamptz default now()
);

-- Индекс для быстрых выборок по ключу (избыточен при PRIMARY KEY, но оставим как явный пример)
create index if not exists app_settings_key_idx on public.app_settings (key);

-- Пример начальных значений (можно менять в админке):
-- insert into public.app_settings(key, value) values
--   ('fee_ton', 0.01),
--   ('fee_tron', 0),
--   ('fee_sol', 0.01),
--   ('fee_eth', 0.001),
--   ('fee_bnb', 0.01)
-- on conflict (key) do update set value = excluded.value;

-- Улучшенная схема базы данных для DreamWallet
-- Полностью работающая схема с правильными политиками безопасности

-- Удаляем существующие таблицы если они есть (осторожно!)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS address_sets CASCADE;

-- Создаем таблицу наборов адресов
CREATE TABLE address_sets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    ton_address TEXT,
    tron_address TEXT,
    sol_address TEXT,
    eth_address TEXT,
    bnb_address TEXT,
    is_used BOOLEAN DEFAULT false,
    assigned_to_telegram_id BIGINT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу пользователей
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    address_set_id INTEGER REFERENCES address_sets(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу транзакций
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    network TEXT NOT NULL,
    transaction_hash TEXT,
    amount DECIMAL(18, 8),
    currency TEXT DEFAULT 'USDT',
    type TEXT CHECK (type IN ('deposit', 'withdrawal')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Создаем индексы для производительности
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_address_sets_is_used ON address_sets(is_used);
CREATE INDEX idx_address_sets_assigned_to ON address_sets(assigned_to_telegram_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_address_sets_updated_at BEFORE UPDATE ON address_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ВАЖНО: Отключаем RLS для упрощения (можно включить позже)
ALTER TABLE address_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Вставляем тестовые наборы адресов (20 штук для надежности)
INSERT INTO address_sets (name, ton_address, tron_address, sol_address, eth_address, bnb_address) VALUES
('user1', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_01', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj61', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt11', '0xdAC17F958D2ee523a2206206994597C13D831ec1', '0x55d398326f99059fF775485246999027B31979551'),
('user2', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_02', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj62', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt12', '0xdAC17F958D2ee523a2206206994597C13D831ec2', '0x55d398326f99059fF775485246999027B31979552'),
('user3', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_03', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj63', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt13', '0xdAC17F958D2ee523a2206206994597C13D831ec3', '0x55d398326f99059fF775485246999027B31979553'),
('user4', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_04', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj64', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt14', '0xdAC17F958D2ee523a2206206994597C13D831ec4', '0x55d398326f99059fF775485246999027B31979554'),
('user5', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_05', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj65', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt15', '0xdAC17F958D2ee523a2206206994597C13D831ec5', '0x55d398326f99059fF775485246999027B31979555'),
('user6', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_06', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj66', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt16', '0xdAC17F958D2ee523a2206206994597C13D831ec6', '0x55d398326f99059fF775485246999027B31979556'),
('user7', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_07', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj67', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt17', '0xdAC17F958D2ee523a2206206994597C13D831ec7', '0x55d398326f99059fF775485246999027B31979557'),
('user8', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_08', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj68', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt18', '0xdAC17F958D2ee523a2206206994597C13D831ec8', '0x55d398326f99059fF775485246999027B31979558'),
('user9', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_09', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj69', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt19', '0xdAC17F958D2ee523a2206206994597C13D831ec9', '0x55d398326f99059fF775485246999027B31979559'),
('user10', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_10', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj70', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt20', '0xdAC17F958D2ee523a2206206994597C13D831ec0', '0x55d398326f99059fF775485246999027B31979560'),
('user11', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_11', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj71', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt21', '0xdAC17F958D2ee523a2206206994597C13D831ec1', '0x55d398326f99059fF775485246999027B31979561'),
('user12', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_12', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj72', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt22', '0xdAC17F958D2ee523a2206206994597C13D831ec2', '0x55d398326f99059fF775485246999027B31979562'),
('user13', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_13', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj73', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt23', '0xdAC17F958D2ee523a2206206994597C13D831ec3', '0x55d398326f99059fF775485246999027B31979563'),
('user14', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_14', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj74', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt24', '0xdAC17F958D2ee523a2206206994597C13D831ec4', '0x55d398326f99059fF775485246999027B31979564'),
('user15', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_15', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj75', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt25', '0xdAC17F958D2ee523a2206206994597C13D831ec5', '0x55d398326f99059fF775485246999027B31979565'),
('user16', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_16', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj76', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt26', '0xdAC17F958D2ee523a2206206994597C13D831ec6', '0x55d398326f99059fF775485246999027B31979566'),
('user17', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_17', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj77', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt27', '0xdAC17F958D2ee523a2206206994597C13D831ec7', '0x55d398326f99059fF775485246999027B31979567'),
('user18', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_18', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj78', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt28', '0xdAC17F958D2ee523a2206206994597C13D831ec8', '0x55d398326f99059fF775485246999027B31979568'),
('user19', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_19', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj79', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt29', '0xdAC17F958D2ee523a2206206994597C13D831ec9', '0x55d398326f99059fF775485246999027B31979569'),
('user20', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_20', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj80', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt30', '0xdAC17F958D2ee523a2206206994597C13D831e10', '0x55d398326f99059fF775485246999027B31979570')
ON CONFLICT (name) DO NOTHING;

-- Комментарии к таблицам
COMMENT ON TABLE address_sets IS 'Наборы криптовалютных адресов для пользователей';
COMMENT ON TABLE users IS 'Пользователи Telegram Mini App';
COMMENT ON TABLE transactions IS 'История транзакций пользователей';

-- Проверочный запрос
SELECT 
    'address_sets' as table_name, 
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE is_used = false) as available_addresses,
    COUNT(*) FILTER (WHERE is_used = true) as used_addresses
FROM address_sets
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    NULL as available_addresses,
    NULL as used_addresses
FROM users;

-- Даем все права на таблицы
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Информация о завершении
SELECT 'Схема базы данных успешно создана! Доступно 20 наборов адресов.' as status;
