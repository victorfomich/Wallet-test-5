// Скрипт для импорта наборов адресов в базу данных
const fs = require('fs');
const { createAddressSet } = require('./api/users.js');

// Функция для парсинга строки с адресами
function parseAddressLine(line) {
    const parts = line.split(',').map(part => part.trim());
    
    if (parts.length < 2) {
        throw new Error('Недостаточно данных в строке');
    }
    
    const name = parts[0];
    if (!name) {
        throw new Error('Отсутствует имя набора');
    }
    
    const addresses = {
        ton: null,
        tron: null,
        sol: null,
        eth: null,
        bnb: null
    };
    
    // Парсим адреса
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const colonIndex = part.indexOf(':');
        
        if (colonIndex > 0) {
            const network = part.substring(0, colonIndex).toLowerCase();
            const address = part.substring(colonIndex + 1);
            
            if (addresses.hasOwnProperty(network) && address) {
                addresses[network] = address;
            }
        }
    }
    
    return { name, addresses };
}

// Функция для импорта из файла
async function importFromFile(filePath) {
    try {
        console.log(`📖 Чтение файла: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Файл не найден: ${filePath}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        console.log(`📝 Найдено строк для импорта: ${lines.length}`);
        
        const results = {
            success: [],
            errors: []
        };
        
        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            
            try {
                const parsed = parseAddressLine(lines[i]);
                
                // Создаем набор адресов
                await createAddressSet(parsed.name, parsed.addresses);
                
                results.success.push({
                    line: lineNumber,
                    name: parsed.name,
                    addresses: parsed.addresses
                });
                
                console.log(`✅ Строка ${lineNumber}: ${parsed.name} - успешно импортирован`);
                
            } catch (error) {
                results.errors.push({
                    line: lineNumber,
                    error: error.message,
                    content: lines[i]
                });
                
                console.error(`❌ Строка ${lineNumber}: ${error.message}`);
            }
        }
        
        // Выводим итоговую статистику
        console.log('\n📊 Результаты импорта:');
        console.log(`✅ Успешно импортировано: ${results.success.length}`);
        console.log(`❌ Ошибок: ${results.errors.length}`);
        
        if (results.errors.length > 0) {
            console.log('\n📋 Ошибки:');
            results.errors.forEach(error => {
                console.log(`   Строка ${error.line}: ${error.error}`);
                console.log(`   Содержимое: ${error.content}`);
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('💥 Критическая ошибка импорта:', error.message);
        throw error;
    }
}

// Функция для импорта из массива строк
async function importFromArray(lines) {
    console.log(`📝 Импорт из массива: ${lines.length} элементов`);
    
    const results = {
        success: [],
        errors: []
    };
    
    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        
        try {
            if (!lines[i].trim()) {
                continue; // Пропускаем пустые строки
            }
            
            const parsed = parseAddressLine(lines[i]);
            
            // Создаем набор адресов
            await createAddressSet(parsed.name, parsed.addresses);
            
            results.success.push({
                line: lineNumber,
                name: parsed.name,
                addresses: parsed.addresses
            });
            
            console.log(`✅ Элемент ${lineNumber}: ${parsed.name} - успешно импортирован`);
            
        } catch (error) {
            results.errors.push({
                line: lineNumber,
                error: error.message,
                content: lines[i]
            });
            
            console.error(`❌ Элемент ${lineNumber}: ${error.message}`);
        }
    }
    
    return results;
}

// Функция для создания примера файла
function createExampleFile(filePath = 'addresses-example.txt') {
    const exampleContent = `user1,ton:EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_01,tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj61,sol:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt11,eth:0xdAC17F958D2ee523a2206206994597C13D831ec1,bnb:0x55d398326f99059fF775485246999027B31979551
user2,ton:EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_02,tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj62,sol:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt12,eth:0xdAC17F958D2ee523a2206206994597C13D831ec2,bnb:0x55d398326f99059fF775485246999027B31979552
user3,ton:EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_03,tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj63,sol:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt13,eth:0xdAC17F958D2ee523a2206206994597C13D831ec3,bnb:0x55d398326f99059fF775485246999027B31979553`;
    
    fs.writeFileSync(filePath, exampleContent);
    console.log(`📄 Создан пример файла: ${filePath}`);
    
    return filePath;
}

// Валидация адреса
function validateAddressFormat(network, address) {
    if (!address) return false;
    
    switch (network) {
        case 'ton':
            return address.startsWith('EQ') && address.length === 48;
        case 'tron':
            return address.startsWith('T') && address.length === 34;
        case 'sol':
            return address.length === 44;
        case 'eth':
        case 'bnb':
            return address.startsWith('0x') && address.length === 42;
        default:
            return false;
    }
}

// Валидация набора адресов
function validateAddressSet(addressSet) {
    const errors = [];
    
    if (!addressSet.name || !addressSet.name.trim()) {
        errors.push('Отсутствует имя набора');
    }
    
    const networks = ['ton', 'tron', 'sol', 'eth', 'bnb'];
    let hasAnyAddress = false;
    
    networks.forEach(network => {
        const address = addressSet.addresses[network];
        if (address) {
            hasAnyAddress = true;
            if (!validateAddressFormat(network, address)) {
                errors.push(`Неверный формат адреса ${network.toUpperCase()}: ${address}`);
            }
        }
    });
    
    if (!hasAnyAddress) {
        errors.push('Не указан ни один адрес');
    }
    
    return errors;
}

// Функция для проверки файла перед импортом
function validateFile(filePath) {
    try {
        console.log(`🔍 Проверка файла: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Файл не найден: ${filePath}`);
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        const validation = {
            totalLines: lines.length,
            validLines: 0,
            errors: []
        };
        
        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            
            try {
                const parsed = parseAddressLine(lines[i]);
                const errors = validateAddressSet(parsed);
                
                if (errors.length === 0) {
                    validation.validLines++;
                } else {
                    validation.errors.push({
                        line: lineNumber,
                        errors: errors,
                        content: lines[i]
                    });
                }
                
            } catch (error) {
                validation.errors.push({
                    line: lineNumber,
                    errors: [error.message],
                    content: lines[i]
                });
            }
        }
        
        console.log(`📊 Результат проверки:`);
        console.log(`   Всего строк: ${validation.totalLines}`);
        console.log(`   Валидных строк: ${validation.validLines}`);
        console.log(`   Строк с ошибками: ${validation.errors.length}`);
        
        if (validation.errors.length > 0) {
            console.log('\n❌ Найденные ошибки:');
            validation.errors.forEach(error => {
                console.log(`   Строка ${error.line}:`);
                error.errors.forEach(err => console.log(`     - ${err}`));
            });
        }
        
        return validation;
        
    } catch (error) {
        console.error('💥 Ошибка при проверке файла:', error.message);
        throw error;
    }
}

// Экспорт функций
module.exports = {
    importFromFile,
    importFromArray,
    createExampleFile,
    validateFile,
    parseAddressLine,
    validateAddressSet,
    validateAddressFormat
};

// CLI интерфейс
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const filePath = args[1];
    
    switch (command) {
        case 'import':
            if (!filePath) {
                console.error('❌ Укажите путь к файлу: node import-addresses.js import addresses.txt');
                process.exit(1);
            }
            
            importFromFile(filePath)
                .then(results => {
                    console.log('\n🎉 Импорт завершен!');
                    process.exit(results.errors.length === 0 ? 0 : 1);
                })
                .catch(error => {
                    console.error('💥 Ошибка импорта:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'validate':
            if (!filePath) {
                console.error('❌ Укажите путь к файлу: node import-addresses.js validate addresses.txt');
                process.exit(1);
            }
            
            try {
                const validation = validateFile(filePath);
                process.exit(validation.errors.length === 0 ? 0 : 1);
            } catch (error) {
                console.error('💥 Ошибка валидации:', error.message);
                process.exit(1);
            }
            break;
            
        case 'example':
            const examplePath = filePath || 'addresses-example.txt';
            createExampleFile(examplePath);
            console.log('🎉 Пример файла создан!');
            break;
            
        default:
            console.log(`
📖 Использование:

  Создать пример файла:
    node import-addresses.js example [путь]

  Проверить файл:
    node import-addresses.js validate <путь-к-файлу>

  Импортировать адреса:
    node import-addresses.js import <путь-к-файлу>

📝 Формат файла:
  имя_набора,ton:адрес,tron:адрес,sol:адрес,eth:адрес,bnb:адрес

🔗 Пример:
  user1,ton:EQD4FPq...,tron:TR7NHqj...,sol:EPjFWdd...,eth:0xdAC17F...,bnb:0x55d398...
            `);
            break;
    }
}
