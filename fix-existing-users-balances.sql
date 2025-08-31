-- Создание балансов для существующих пользователей, у которых их нет
-- Этот скрипт нужно выполнить ОДИН РАЗ в Supabase SQL Editor

INSERT INTO user_balances (
    telegram_id,
    usdt_amount, usdt_price, usdt_change_percent, usdt_usd_value,
    eth_amount, eth_price, eth_change_percent, eth_usd_value,
    ton_amount, ton_price, ton_change_percent, ton_usd_value,
    sol_amount, sol_price, sol_change_percent, sol_usd_value,
    trx_amount, trx_price, trx_change_percent, trx_usd_value,
    created_at, updated_at
)
SELECT 
    u.telegram_id,
    -- USDT - $1.00, 0 USDT, 0% изменения
    0, 1.00, 0, 0,
    -- ETH - примерная цена $3000
    0, 3000.00, 0, 0,
    -- TON - примерная цена $5
    0, 5.00, 0, 0,
    -- SOL - примерная цена $150
    0, 150.00, 0, 0,
    -- TRX - примерная цена $0.15
    0, 0.15, 0, 0,
    NOW(), NOW()
FROM users u
LEFT JOIN user_balances ub ON u.telegram_id = ub.telegram_id
WHERE ub.telegram_id IS NULL;

-- Проверяем результат
SELECT 
    COUNT(*) as total_users,
    (SELECT COUNT(*) FROM user_balances) as users_with_balances
FROM users;
