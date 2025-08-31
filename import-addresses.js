import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Ошибка: Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Создаем клиент Supabase с service role key для полного доступа
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Функция для парсинга строки с адресами и ключами
function parseAddressLineWithKeys(line) {
  const parts = line.split(', ');
  const username = parts[0];
  const addresses = {};
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const match = part.match(/(\w+):\[([^\]]+)\]:\[([^\]]+)\]/);
    
    if (match) {
      const network = match[1];
      const address = match[2];
      const key = match[3];
      
      // Определяем тип ключа по сети
      let keyType, mnemonic24, mnemonic12, privateKeyHex;
      
      if (network === 'ton') {
        keyType = 'mnemonic_24';
        mnemonic24 = key;
      } else if (network === 'sol') {
        keyType = 'mnemonic_12';
        mnemonic12 = key;
      } else {
        // tron, eth, bnb
        keyType = 'private_key_hex';
        privateKeyHex = key;
      }
      
      addresses[network] = {
        address,
        keyType,
        mnemonic24,
        mnemonic12,
        privateKeyHex
      };
    }
  }
  
  return { username, addresses };
}

// Функция для валидации адресов
function validateAddress(network, address) {
  switch (network) {
    case 'ton':
      return address.startsWith('EQ') && address.length >= 48;
    case 'tron':
      return address.startsWith('T') && address.length === 34;
    case 'sol':
      return address.length >= 32 && address.length <= 44;
    case 'eth':
      return address.startsWith('0x') && address.length === 42;
    case 'bnb':
      return address.startsWith('0x') && address.length === 42;
    default:
      return true;
  }
}

// Функция для импорта адресов с ключами в Supabase
async function importAddressesWithKeysToSupabase(addressesData) {
  console.log('🚀 Начинаем импорт адресов с ключами в Supabase...');
  
  let successCount = 0;
  let errorCount = 0;
  let stats = {
    mnemonic_24: 0,
    mnemonic_12: 0,
    private_key_hex: 0
  };
  
  for (const [username, addresses] of Object.entries(addressesData)) {
    console.log(`\n📝 Обрабатываем пользователя: ${username}`);
    
    for (const [network, data] of Object.entries(addresses)) {
      try {
        // Валидируем адрес
        if (!validateAddress(network, data.address)) {
          console.warn(`⚠️  Неверный формат адреса для ${network}: ${data.address}`);
          continue;
        }
        
        // Подготавливаем данные для вставки
        const addressData = {
          network,
          address: data.address,
          name: `${network.toUpperCase()} Wallet`,
          standard: getStandard(network),
          icon: getIcon(network),
          color: getColor(network),
          key_type: data.keyType,
          mnemonic_24: data.mnemonic24 || null,
          mnemonic_12: data.mnemonic12 || null,
          private_key_hex: data.privateKeyHex || null,
          is_assigned: false
        };
        
        // Вставляем адрес в базу
        const { data: insertedAddress, error } = await supabase
          .from('address_pool')
          .insert([addressData])
          .select()
          .single();
        
        if (error) {
          if (error.code === '23505') { // Уникальное ограничение
            console.log(`ℹ️  Адрес ${network} для ${username} уже существует`);
          } else {
            throw error;
          }
        } else {
          console.log(`✅ Импортирован ${network} адрес для ${username}`);
          successCount++;
          
          // Обновляем статистику
          if (data.keyType === 'mnemonic_24') stats.mnemonic_24++;
          else if (data.keyType === 'mnemonic_12') stats.mnemonic_12++;
          else if (data.keyType === 'private_key_hex') stats.private_key_hex++;
        }
        
      } catch (error) {
        console.error(`❌ Ошибка при импорте ${network} адреса для ${username}:`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log('\n📊 Результаты импорта:');
  console.log(`✅ Успешно импортировано: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`🔑 Mnemonic 24 слова: ${stats.mnemonic_24}`);
  console.log(`🔑 Mnemonic 12 слов: ${stats.mnemonic_12}`);
  console.log(`🔑 Private Key Hex: ${stats.private_key_hex}`);
  
  return { successCount, errorCount, stats };
}

// Вспомогательные функции
function getStandard(network) {
  const standards = {
    'ton': 'TON',
    'tron': 'TRC20',
    'sol': 'SPL',
    'eth': 'ERC20',
    'bnb': 'BEP20'
  };
  return standards[network] || 'Unknown';
}

function getIcon(network) {
  const icons = {
    'ton': 'toncoin.png',
    'tron': 'tron.png',
    'sol': 'solana.png',
    'eth': 'ethereum.svg',
    'bnb': 'bnb.webp'
  };
  return icons[network] || 'default.png';
}

function getColor(network) {
  const colors = {
    'ton': '#0088CC',
    'tron': '#FF0000',
    'sol': '#9945FF',
    'eth': '#627EEA',
    'bnb': '#F3BA2F'
  };
  return colors[network] || '#000000';
}

// Основная функция
async function main() {
  try {
    // Получаем имя файла из аргументов командной строки
    const inputFile = process.argv[2] || 'addresses-with-keys.txt';
    
    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Файл ${inputFile} не найден!`);
      console.log('💡 Создайте файл addresses-with-keys.txt с вашими адресами');
      process.exit(1);
    }
    
    console.log(`📁 Читаем файл: ${inputFile}`);
    
    // Читаем файл
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    console.log(`📝 Найдено строк: ${lines.length}`);
    
    // Парсим каждую строку
    const addressesData = {};
    
    for (const line of lines) {
      if (line.trim()) {
        const parsed = parseAddressLineWithKeys(line.trim());
        if (parsed.username && Object.keys(parsed.addresses).length > 0) {
          addressesData[parsed.username] = parsed.addresses;
        }
      }
    }
    
    console.log(`👥 Найдено пользователей: ${Object.keys(addressesData).length}`);
    
    if (Object.keys(addressesData).length === 0) {
      console.error('❌ Не удалось распарсить ни одного адреса!');
      console.log('💡 Проверьте формат файла. Пример:');
      console.log('user1, ton:[EQD4...]:[word1 word2 ... word24], tron:[TR7N...]:[386923d5deff3a050e1d1701bff18966...]');
      process.exit(1);
    }
    
    // Импортируем в Supabase
    await importAddressesWithKeysToSupabase(addressesData);
    
    console.log('\n🎉 Импорт завершен!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
