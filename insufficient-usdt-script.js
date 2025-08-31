// Telegram Web App API
let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Загружаем баланс USDT
    loadCurrentUsdtBalance();
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
});

// Загрузка текущего USDT баланса
async function loadCurrentUsdtBalance() {
    try {
        console.log('💰 ЗАГРУЖАЕМ ТЕКУЩИЙ USDT БАЛАНС...');
        
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
        console.log('📊 ПОЛУЧЕН БАЛАНС:', data);
        
        if (data.success && data.balance && data.balance.usdt_amount !== undefined) {
            updateBalanceDisplay(data.balance.usdt_amount);
        } else {
            console.log('⚠️ USDT баланс не найден');
            updateBalanceDisplay(0);
        }
        
    } catch (error) {
        console.error('💥 ОШИБКА ЗАГРУЗКИ БАЛАНСА:', error);
        updateBalanceDisplay(0);
    }
}

// Обновить отображение баланса
function updateBalanceDisplay(usdtAmount) {
    const balanceElement = document.getElementById('currentBalance');
    if (balanceElement) {
        balanceElement.textContent = `${usdtAmount.toFixed(6)} USDT`;
        balanceElement.style.color = '#ff4757'; // Красный цвет для недостаточного баланса
        console.log(`✅ БАЛАНС ОТОБРАЖЕН: ${usdtAmount.toFixed(6)} USDT`);
    }
}

// Функция для возврата назад
function goBack() {
    // Возвращаемся на страницу выбора сети
    window.location.href = 'usdt-chain.html';
}

// Функции для полноценного приложения
function initAppRestrictions() {
    // Отключаем контекстное меню
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
