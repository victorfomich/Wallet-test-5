-- P2P merchants and global settings

CREATE TABLE IF NOT EXISTS p2p_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    min_amount_usd NUMERIC(18, 8) NOT NULL DEFAULT 300,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO p2p_settings (id, min_amount_usd)
VALUES (1, 300)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS p2p_merchants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    merchant_type VARCHAR(8) NOT NULL DEFAULT 'sell' CHECK (merchant_type IN ('sell', 'buy')),
    price NUMERIC(18, 8) NOT NULL DEFAULT 1,
    price_currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    min_amount NUMERIC(18, 8) NOT NULL DEFAULT 300,
    max_amount NUMERIC(18, 8),
    deals_count INTEGER NOT NULL DEFAULT 0,
    payment_methods TEXT,
    completion_rate NUMERIC(5, 2),
    response_time VARCHAR(64),
    note TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_merchants_enabled_sort
    ON p2p_merchants (is_enabled, sort_order, id);

INSERT INTO p2p_merchants (name, merchant_type, price, price_currency, min_amount, max_amount, deals_count, payment_methods, completion_rate, response_time, sort_order)
VALUES
    ('DreamExchange', 'sell', 98.50, 'RUB', 300, 50000, 1240, 'Сбербанк, Тинькофф, СБП', 99.2, '5 мин', 10),
    ('CryptoMart', 'sell', 98.20, 'RUB', 300, 25000, 856, 'Тинькофф, СБП', 98.5, '10 мин', 20),
    ('FastUSDT', 'buy', 97.80, 'RUB', 300, 100000, 2103, 'Сбербанк, Альфа-Банк', 99.8, '3 мин', 30);
