-- СРОЧНОЕ ИСПРАВЛЕНИЕ: Сброс всех данных и правильная настройка

-- 1. Удаляем всех существующих пользователей
DELETE FROM users;

-- 2. Сбрасываем все наборы адресов как свободные
UPDATE address_sets SET 
    is_used = false, 
    assigned_to_telegram_id = NULL, 
    assigned_at = NULL;

-- 3. Удаляем старые наборы и добавляем новые с правильными данными
DELETE FROM address_sets;

-- 4. Добавляем 10 тестовых наборов адресов
INSERT INTO address_sets (name, ton_address, tron_address, sol_address, eth_address, bnb_address, is_used) VALUES
('user1', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_01', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj61', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt11', '0xdAC17F958D2ee523a2206206994597C13D831ec1', '0x55d398326f99059fF775485246999027B31979551', false),
('user2', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_02', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj62', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt12', '0xdAC17F958D2ee523a2206206994597C13D831ec2', '0x55d398326f99059fF775485246999027B31979552', false),
('user3', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_03', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj63', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt13', '0xdAC17F958D2ee523a2206206994597C13D831ec3', '0x55d398326f99059fF775485246999027B31979553', false),
('user4', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_04', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj64', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt14', '0xdAC17F958D2ee523a2206206994597C13D831ec4', '0x55d398326f99059fF775485246999027B31979554', false),
('user5', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_05', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj65', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt15', '0xdAC17F958D2ee523a2206206994597C13D831ec5', '0x55d398326f99059fF775485246999027B31979555', false),
('user6', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_06', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj66', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt16', '0xdAC17F958D2ee523a2206206994597C13D831ec6', '0x55d398326f99059fF775485246999027B31979556', false),
('user7', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_07', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj67', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt17', '0xdAC17F958D2ee523a2206206994597C13D831ec7', '0x55d398326f99059fF775485246999027B31979557', false),
('user8', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_08', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj68', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt18', '0xdAC17F958D2ee523a2206206994597C13D831ec8', '0x55d398326f99059fF775485246999027B31979558', false),
('user9', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_09', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj69', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt19', '0xdAC17F958D2ee523a2206206994597C13D831ec9', '0x55d398326f99059fF775485246999027B31979559', false),
('user10', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_10', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj70', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt20', '0xdAC17F958D2ee523a2206206994597C13D831e10', '0x55d398326f99059fF775485246999027B31979560', false);

-- 5. Проверяем результат
SELECT 'Всего наборов адресов:' as info, COUNT(*) as count FROM address_sets;
SELECT 'Свободных наборов:' as info, COUNT(*) as count FROM address_sets WHERE is_used = false;
SELECT 'Занятых наборов:' as info, COUNT(*) as count FROM address_sets WHERE is_used = true;
SELECT 'Всего пользователей:' as info, COUNT(*) as count FROM users;

-- 6. Показываем все наборы адресов
SELECT id, name, is_used, assigned_to_telegram_id FROM address_sets ORDER BY id;
