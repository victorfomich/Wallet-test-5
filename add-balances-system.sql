-- Добавление системы балансов для пользователей

-- Создаем таблицу балансов пользователей
CREATE TABLE IF NOT EXISTS user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL,
    
    -- USDT
    usdt_amount DECIMAL(18, 8) DEFAULT 0.125691,
    usdt_price DECIMAL(18, 8) DEFAULT 1.00,
    usdt_change_percent DECIMAL(5, 2) DEFAULT 0.00,
    usdt_usd_value DECIMAL(18, 8) DEFAULT 0.125,
    
    -- Ethereum  
    eth_amount DECIMAL(18, 8) DEFAULT 0,
    eth_price DECIMAL(18, 8) DEFAULT 4454.73,
    eth_change_percent DECIMAL(5, 2) DEFAULT 2.29,
    eth_usd_value DECIMAL(18, 8) DEFAULT 0.00000642,
    
    -- Toncoin
    ton_amount DECIMAL(18, 8) DEFAULT 0,
    ton_price DECIMAL(18, 8) DEFAULT 3.14,
    ton_change_percent DECIMAL(5, 2) DEFAULT 1.68,
    ton_usd_value DECIMAL(18, 8) DEFAULT 0,
    
    -- Solana
    sol_amount DECIMAL(18, 8) DEFAULT 0,
    sol_price DECIMAL(18, 8) DEFAULT 142.67,
    sol_change_percent DECIMAL(5, 2) DEFAULT 5.23,
    sol_usd_value DECIMAL(18, 8) DEFAULT 0,
    
    -- Tron
    trx_amount DECIMAL(18, 8) DEFAULT 0,
    trx_price DECIMAL(18, 8) DEFAULT 0.12,
    trx_change_percent DECIMAL(5, 2) DEFAULT 2.15,
    trx_usd_value DECIMAL(18, 8) DEFAULT 0,
    
    -- Общий баланс в USD (вычисляется автоматически)
    total_usd_balance DECIMAL(18, 8) DEFAULT 0.125,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем уникальный индекс по telegram_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_balances_telegram_id ON user_balances(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- Функция для автоматического расчета общего баланса
CREATE OR REPLACE FUNCTION update_total_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_usd_balance = 
        (NEW.usdt_amount * NEW.usdt_price) +
        (NEW.eth_amount * NEW.eth_price) +
        (NEW.ton_amount * NEW.ton_price) +
        (NEW.sol_amount * NEW.sol_price) +
        (NEW.trx_amount * NEW.trx_price);
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического пересчета баланса
CREATE TRIGGER trigger_update_total_balance
    BEFORE INSERT OR UPDATE ON user_balances
    FOR EACH ROW EXECUTE FUNCTION update_total_balance();

-- Функция для создания баланса пользователя с значениями по умолчанию
CREATE OR REPLACE FUNCTION create_user_balance(user_telegram_id BIGINT, user_table_id INTEGER DEFAULT NULL)
RETURNS user_balances AS $$
DECLARE
    new_balance user_balances;
BEGIN
    INSERT INTO user_balances (
        user_id, 
        telegram_id,
        usdt_amount, usdt_price, usdt_change_percent, usdt_usd_value,
        eth_amount, eth_price, eth_change_percent, eth_usd_value,
        ton_amount, ton_price, ton_change_percent, ton_usd_value,
        sol_amount, sol_price, sol_change_percent, sol_usd_value,
        trx_amount, trx_price, trx_change_percent, trx_usd_value
    ) VALUES (
        user_table_id,
        user_telegram_id,
        0.125691, 1.00, 0.00, 0.125,  -- USDT
        0, 4454.73, 2.29, 0.00000642,  -- ETH
        0, 3.14, 1.68, 0,              -- TON
        0, 142.67, 5.23, 0,            -- SOL
        0, 0.12, 2.15, 0               -- TRX
    )
    RETURNING * INTO new_balance;
    
    RETURN new_balance;
END;
$$ language 'plpgsql';

-- Комментарии к полям
COMMENT ON TABLE user_balances IS 'Балансы пользователей по всем поддерживаемым криптовалютам';
COMMENT ON COLUMN user_balances.telegram_id IS 'Telegram ID пользователя';
COMMENT ON COLUMN user_balances.usdt_amount IS 'Количество USDT у пользователя';
COMMENT ON COLUMN user_balances.usdt_price IS 'Текущая цена USDT в USD';
COMMENT ON COLUMN user_balances.usdt_change_percent IS 'Изменение цены USDT в процентах за 24ч';
COMMENT ON COLUMN user_balances.total_usd_balance IS 'Общий баланс пользователя в USD (автоматически вычисляется)';

-- Права доступа
GRANT ALL ON user_balances TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE user_balances_id_seq TO anon, authenticated, service_role;

-- Проверяем результат
SELECT 'Система балансов успешно создана!' as status;

-- Показываем структуру таблицы
\d user_balances;
