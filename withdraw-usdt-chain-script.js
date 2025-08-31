// Telegram Web App API
let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Определяем и применяем тему
    initTheme();
    
    // Инициализируем клики по сетям
    initNetworkClicks();
    
    // ЗАГРУЖАЕМ USDT БАЛАНС ДЛЯ ПРОВЕРКИ
    loadUsdtBalance();
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
});

// ПЕРЕМЕННАЯ ДЛЯ ХРАНЕНИЯ БАЛАНСА USDT
let currentUsdtBalance = 0;

// Инициализация темы
function initTheme() {
    // Устанавливаем только темную тему
    document.documentElement.setAttribute('data-theme', 'dark');
}

// Функция для обработки кликов по сетям
function initNetworkClicks() {
    const networkItems = document.querySelectorAll('.network-item');
    
    networkItems.forEach(item => {
        item.addEventListener('click', function() {
            // ПРОВЕРЯЕМ БАЛАНС USDT ПЕРЕД ВЫВОДОМ
            if (currentUsdtBalance < 1) {
                console.log(`⚠️ НЕДОСТАТОЧНО USDT ДЛЯ ВЫВОДА: ${currentUsdtBalance} < 1`);
                window.location.href = 'insufficient-usdt.html';
                return;
            }
            
            // Если баланс достаточен, получаем данные о сети
            const network = this.getAttribute('data-network');
            const crypto = this.getAttribute('data-crypto');
            const networkName = this.querySelector('.network-name').textContent;
            const networkStandard = this.querySelector('.network-standard').textContent;
            
            console.log(`✅ БАЛАНС ДОСТАТОЧЕН: ${currentUsdtBalance} >= 1, переходим к выводу ${crypto} через ${network}`);
            
            // Переходим на страницу вывода USDT
            window.location.href = `usdt-withdraw.html?network=${network}`;
        });
    });
}

// Функции для полноценного приложения
function initAppRestrictions() {
    // Отключаем контекстное меню (правый клик)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Отключаем выделение текста
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Отключаем перетаскивание элементов
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Отключаем двойной клик для выделения
    document.addEventListener('dblclick', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Отключаем зум жестами
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
        return false;
    });
    
    document.addEventListener('gestureend', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Отключаем зум колесиком мыши
    document.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            return false;
        }
    }, { passive: false });
    
    // Отключаем зум на мобильных устройствах
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
            return false;
        }
    }, { passive: false });
    
    document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
            return false;
        }
    }, { passive: false });
}

// Функция для возврата на страницу вывода
function goBack() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.location.href = 'withdraw.html';
        });
    } else {
        // Если Telegram Web App недоступен, добавляем кнопку назад
        const backButton = document.createElement('button');
        backButton.textContent = '← Назад';
        backButton.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 8px 16px;
            background-color: #007AFF;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 1000;
        `;
        backButton.onclick = () => window.location.href = 'withdraw.html';
        document.body.appendChild(backButton);
    }
}

// Показываем кнопку назад
goBack();

// ==================== ЗАГРУЗКА USDT БАЛАНСА ====================

async function loadUsdtBalance() {
    try {
        console.log('💰 ЗАГРУЖАЕМ USDT БАЛАНС ДЛЯ ПРОВЕРКИ ВЫВОДА...');
        
        // Получаем Telegram ID пользователя
        let telegramId = null;
        if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
            telegramId = tg.initDataUnsafe.user.id;
        } else {
            telegramId = 123456789; // Тестовый ID
        }
        
        const response = await fetch(`/api/admin/balances?telegram_id=${telegramId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 ПОЛУЧЕН БАЛАНС ДЛЯ ПРОВЕРКИ ВЫВОДА:', data);
        
        if (data.success && data.balance && data.balance.usdt_amount !== undefined) {
            currentUsdtBalance = data.balance.usdt_amount;
            console.log(`✅ USDT БАЛАНС ЗАГРУЖЕН: ${currentUsdtBalance}`);
        } else {
            console.log('⚠️ USDT баланс не найден, устанавливаем 0');
            currentUsdtBalance = 0;
        }
        
    } catch (error) {
        console.error('💥 ОШИБКА ЗАГРУЗКИ БАЛАНСА:', error);
        currentUsdtBalance = 0;
    }
}
