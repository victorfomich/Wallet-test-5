-- Добавляем тестовые наборы адресов для проверки
-- Выполните этот SQL в Supabase SQL Editor

INSERT INTO address_sets (name, ton_address, tron_address, sol_address, eth_address, bnb_address, is_used) VALUES
('user1', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_01', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj61', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt11', '0xdAC17F958D2ee523a2206206994597C13D831ec1', '0x55d398326f99059fF775485246999027B31979551', false),
('user2', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_02', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj62', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt12', '0xdAC17F958D2ee523a2206206994597C13D831ec2', '0x55d398326f99059fF775485246999027B31979552', false),
('user3', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_03', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj63', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt13', '0xdAC17F958D2ee523a2206206994597C13D831ec3', '0x55d398326f99059fF775485246999027B31979553', false),
('user4', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_04', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj64', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt14', '0xdAC17F958D2ee523a2206206994597C13D831ec4', '0x55d398326f99059fF775485246999027B31979554', false),
('user5', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_05', 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj65', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt15', '0xdAC17F958D2ee523a2206206994597C13D831ec5', '0x55d398326f99059fF775485246999027B31979555', false)
ON CONFLICT (name) DO NOTHING;

-- Проверяем, что данные добавлены
SELECT * FROM address_sets WHERE is_used = false;
