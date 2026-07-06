-- Roulette system tables for DreamWallet

-- Global prize probabilities (weights are relative, not percentages)
CREATE TABLE IF NOT EXISTS roulette_settings (
    id SERIAL PRIMARY KEY,
    prize_amount NUMERIC(18, 8) NOT NULL UNIQUE,
    probability_weight NUMERIC(18, 8) NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user probability overrides (NULL weight = use global)
CREATE TABLE IF NOT EXISTS roulette_user_settings (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    prize_amount NUMERIC(18, 8) NOT NULL,
    probability_weight NUMERIC(18, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (telegram_id, prize_amount)
);

-- Spin history
CREATE TABLE IF NOT EXISTS roulette_spins (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    spin_cost NUMERIC(18, 8) NOT NULL DEFAULT 1,
    prize_amount NUMERIC(18, 8) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    balance_before NUMERIC(18, 8),
    balance_after NUMERIC(18, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roulette_spins_telegram_id ON roulette_spins(telegram_id);
CREATE INDEX IF NOT EXISTS idx_roulette_spins_created_at ON roulette_spins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_user_settings_telegram_id ON roulette_user_settings(telegram_id);

-- Default global probabilities
INSERT INTO roulette_settings (prize_amount, probability_weight) VALUES
    (0.1, 40),
    (0.5, 25),
    (0.8, 15),
    (1,   10),
    (2,    5),
    (5,    3),
    (10,   1.5),
    (100,  0.5)
ON CONFLICT (prize_amount) DO NOTHING;
