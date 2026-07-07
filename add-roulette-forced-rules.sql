-- Additional roulette admin features
-- 1) Forced prize rule per user (e.g. every 3 spins give 100 USDT)

CREATE TABLE IF NOT EXISTS roulette_user_forced_rules (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    every_n_spins INTEGER,
    forced_prize_amount NUMERIC(18, 8),
    spins_since_forced INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roulette_user_forced_rules_telegram_id
    ON roulette_user_forced_rules(telegram_id);
