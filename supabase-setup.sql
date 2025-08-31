-- Создание таблиц для DreamWallet

-- Таблица наборов адресов (address_sets)
CREATE TABLE IF NOT EXISTS address_sets (
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

-- Таблица пользователей (users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    address_set_id INTEGER REFERENCES address_sets(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица истории транзакций (transactions) - для будущего использования
CREATE TABLE IF NOT EXISTS transactions (
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

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_address_sets_is_used ON address_sets(is_used);
CREATE INDEX IF NOT EXISTS idx_address_sets_assigned_to ON address_sets(assigned_to_telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

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

-- RLS (Row Level Security) политики
ALTER TABLE address_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Политика для чтения address_sets (все могут читать)
CREATE POLICY "Anyone can read address_sets" ON address_sets
    FOR SELECT USING (true);

-- Политика для обновления address_sets (только сервисный ключ)
CREATE POLICY "Service role can update address_sets" ON address_sets
    FOR UPDATE USING (auth.role() = 'service_role');

-- Политика для вставки address_sets (только сервисный ключ)
CREATE POLICY "Service role can insert address_sets" ON address_sets
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Политика для удаления address_sets (только сервисный ключ)
CREATE POLICY "Service role can delete address_sets" ON address_sets
    FOR DELETE USING (auth.role() = 'service_role');

-- Политика для чтения users (все могут читать)
CREATE POLICY "Anyone can read users" ON users
    FOR SELECT USING (true);

-- Политика для обновления users (только сервисный ключ)
CREATE POLICY "Service role can update users" ON users
    FOR UPDATE USING (auth.role() = 'service_role');

-- Политика для вставки users (только сервисный ключ)
CREATE POLICY "Service role can insert users" ON users
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Политики для transactions
CREATE POLICY "Users can read own transactions" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage transactions" ON transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Вставка примерных данных (для тестирования)
-- Этот блок можно удалить в продакшене

INSERT INTO address_sets (name, ton_address, tron_address, sol_address, eth_address, bnb_address) VALUES
('user1', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_01', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj61', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt11', '0xdAC17F958D2ee523a2206206994597C13D831ec1', '0x55d398326f99059fF775485246999027B31979551'),
('user2', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_02', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj62', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt12', '0xdAC17F958D2ee523a2206206994597C13D831ec2', '0x55d398326f99059fF775485246999027B31979552'),
('user3', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_03', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj63', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt13', '0xdAC17F958D2ee523a2206206994597C13D831ec3', '0x55d398326f99059fF775485246999027B31979553'),
('user4', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_04', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj64', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt14', '0xdAC17F958D2ee523a2206206994597C13D831ec4', '0x55d398326f99059fF775485246999027B31979554'),
('user5', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_05', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj65', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt15', '0xdAC17F958D2ee523a2206206994597C13D831ec5', '0x55d398326f99059fF775485246999027B31979555')
ON CONFLICT (name) DO NOTHING;

-- Комментарии к таблицам и столбцам
COMMENT ON TABLE address_sets IS 'Наборы криптовалютных адресов для пользователей';
COMMENT ON COLUMN address_sets.name IS 'Уникальное имя набора адресов (например, user1, user2)';
COMMENT ON COLUMN address_sets.is_used IS 'Флаг, указывающий, назначен ли набор адресов пользователю';
COMMENT ON COLUMN address_sets.assigned_to_telegram_id IS 'Telegram ID пользователя, которому назначен набор';

COMMENT ON TABLE users IS 'Пользователи Telegram Mini App';
COMMENT ON COLUMN users.telegram_id IS 'Уникальный ID пользователя в Telegram';
COMMENT ON COLUMN users.address_set_id IS 'Ссылка на назначенный набор адресов';

COMMENT ON TABLE transactions IS 'История транзакций пользователей (депозиты/выводы)';
