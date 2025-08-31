-- Добавление полей для секретов (приватных ключей/мнемонических фраз) к каждой сети

-- Добавляем новые столбцы для секретов
ALTER TABLE address_sets 
ADD COLUMN IF NOT EXISTS ton_secret TEXT,
ADD COLUMN IF NOT EXISTS tron_secret TEXT,
ADD COLUMN IF NOT EXISTS sol_secret TEXT,
ADD COLUMN IF NOT EXISTS eth_secret TEXT,
ADD COLUMN IF NOT EXISTS bnb_secret TEXT;

-- Добавляем комментарии к новым столбцам
COMMENT ON COLUMN address_sets.ton_secret IS 'Приватный ключ или мнемоническая фраза для TON адреса';
COMMENT ON COLUMN address_sets.tron_secret IS 'Приватный ключ или мнемоническая фраза для TRON адреса';
COMMENT ON COLUMN address_sets.sol_secret IS 'Приватный ключ или мнемоническая фраза для Solana адреса';
COMMENT ON COLUMN address_sets.eth_secret IS 'Приватный ключ или мнемоническая фраза для Ethereum адреса';
COMMENT ON COLUMN address_sets.bnb_secret IS 'Приватный ключ или мнемоническая фраза для BNB Smart Chain адреса';

-- Обновляем существующие записи тестовыми секретами
UPDATE address_sets SET 
    ton_secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    tron_secret = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    sol_secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    eth_secret = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    bnb_secret = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'
WHERE id = 1;

UPDATE address_sets SET 
    ton_secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
    tron_secret = '0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1',
    sol_secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon auto',
    eth_secret = '0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901',
    bnb_secret = '0xedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321f'
WHERE id = 2;

UPDATE address_sets SET 
    ton_secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon acid',
    tron_secret = '0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12',
    sol_secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon baby',
    eth_secret = '0xcdef123456789012cdef123456789012cdef123456789012cdef123456789012',
    bnb_secret = '0xdcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fe'
WHERE id = 3;

-- Обновляем все остальные записи случайными секретами
UPDATE address_sets SET 
    ton_secret = CASE 
        WHEN id % 3 = 1 THEN 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon address'
        WHEN id % 3 = 2 THEN 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent'
        ELSE 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon air'
    END,
    tron_secret = '0x' || LPAD(TO_HEX(id * 1111111111111111), 64, '0'),
    sol_secret = CASE 
        WHEN id % 2 = 0 THEN 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon camp'
        ELSE 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon car'
    END,
    eth_secret = '0x' || LPAD(TO_HEX(id * 2222222222222222), 64, '0'),
    bnb_secret = '0x' || LPAD(TO_HEX(id * 3333333333333333), 64, '0')
WHERE ton_secret IS NULL;

-- Проверяем результат
SELECT 
    id, 
    name,
    is_used,
    ton_address,
    LEFT(ton_secret, 20) || '...' as ton_secret_preview,
    tron_address,
    LEFT(tron_secret, 20) || '...' as tron_secret_preview,
    sol_address,
    LEFT(sol_secret, 20) || '...' as sol_secret_preview
FROM address_sets 
ORDER BY id 
LIMIT 5;

-- Информация о завершении
SELECT 'Секреты успешно добавлены ко всем адресам!' as status;
