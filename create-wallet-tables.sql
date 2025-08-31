-- Создание всех таблиц для DreamWallet с уникальными именами
-- Выполните этот SQL в Supabase SQL Editor

-- ==================== ТАБЛИЦА ТРАНЗАКЦИЙ КОШЕЛЬКА ====================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'withdraw', 'deposit', 'transfer'
    crypto_currency VARCHAR(10) NOT NULL, -- 'USDT', 'ETH', 'TON', 'SOL', 'TRX'
    blockchain_network VARCHAR(20) NOT NULL, -- 'ton', 'tron', 'eth', 'sol', 'bnb'
    withdraw_amount DECIMAL(20,8) NOT NULL,
    network_fee DECIMAL(20,8) DEFAULT 0,
    recipient_address TEXT NOT NULL,
    user_comment TEXT,
    transaction_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    blockchain_hash TEXT, -- хеш транзакции в блокчейне
    created_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== ТАБЛИЦА ИСТОРИИ БАЛАНСОВ ====================
CREATE TABLE IF NOT EXISTS wallet_balance_history (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    crypto_currency VARCHAR(10) NOT NULL,
    balance_change DECIMAL(20,8) NOT NULL, -- + или - изменение
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    change_reason VARCHAR(50) NOT NULL, -- 'withdraw', 'deposit', 'admin_update'
    related_transaction_id BIGINT, -- ссылка на wallet_transactions
    created_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (related_transaction_id) REFERENCES wallet_transactions(id) ON DELETE SET NULL
);

-- ==================== ИНДЕКСЫ ДЛЯ БЫСТРОГО ПОИСКА ====================
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_telegram_id ON wallet_transactions(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_balance_history_telegram_id ON wallet_balance_history(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_history_currency ON wallet_balance_history(crypto_currency);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_history_created ON wallet_balance_history(created_timestamp DESC);

-- ==================== RLS ПОЛИТИКИ ====================
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balance_history ENABLE ROW LEVEL SECURITY;

-- Политики для wallet_transactions
CREATE POLICY "wallet_transactions_select_policy" ON wallet_transactions
    FOR SELECT USING (true);

CREATE POLICY "wallet_transactions_all_policy" ON wallet_transactions
    FOR ALL USING (true);

-- Политики для wallet_balance_history
CREATE POLICY "wallet_balance_history_select_policy" ON wallet_balance_history
    FOR SELECT USING (true);

CREATE POLICY "wallet_balance_history_all_policy" ON wallet_balance_history
    FOR ALL USING (true);

-- ==================== ТРИГГЕРЫ ДЛЯ ОБНОВЛЕНИЯ TIMESTAMP ====================
CREATE OR REPLACE FUNCTION update_wallet_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_timestamp = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для wallet_transactions
DROP TRIGGER IF EXISTS trigger_wallet_transactions_updated_timestamp ON wallet_transactions;
CREATE TRIGGER trigger_wallet_transactions_updated_timestamp
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_updated_timestamp();

-- ==================== ПРОВЕРКА СОЗДАНИЯ ТАБЛИЦ ====================
-- Проверяем что таблицы созданы
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('wallet_transactions', 'wallet_balance_history')
ORDER BY tablename;

-- Проверяем структуру wallet_transactions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_transactions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
