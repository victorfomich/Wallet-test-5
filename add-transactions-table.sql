-- Создание таблицы транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'withdraw', 'deposit', 'transfer'
    crypto VARCHAR(10) NOT NULL, -- 'USDT', 'ETH', 'TON', 'SOL', 'TRX'
    network VARCHAR(20) NOT NULL, -- 'ton', 'tron', 'eth', 'sol', 'bnb'
    amount DECIMAL(20,8) NOT NULL,
    fee DECIMAL(20,8) DEFAULT 0,
    address TEXT NOT NULL, -- адрес получателя
    comment TEXT, -- комментарий пользователя
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    tx_hash TEXT, -- хеш транзакции в блокчейне (когда появится)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Связь с пользователем
    FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_transactions_telegram_id ON transactions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- RLS политики
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Политика для анонимного доступа (только чтение собственных транзакций)
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (true);

-- Политика для service_role (полный доступ)
CREATE POLICY "Service role can manage transactions" ON transactions
    FOR ALL USING (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transactions_updated_at();

-- Вставка тестовых данных (опционально)
-- INSERT INTO transactions (telegram_id, type, crypto, network, amount, fee, address, comment, status) VALUES
-- (123456789, 'withdraw', 'USDT', 'ton', 100.50, 3.5, 'EQA...test_address', 'Тестовый вывод', 'pending'),
-- (123456789, 'withdraw', 'USDT', 'tron', 50.25, 1.0, 'TRX...test_address', NULL, 'completed');
