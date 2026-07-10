-- Поднять минимум сделки у существующих мерчантов до $300 (опционально)
UPDATE merchants
SET min_amount = 300,
    updated_at = NOW()
WHERE min_amount < 300;
