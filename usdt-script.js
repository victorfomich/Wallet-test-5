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
    
    // Инициализируем функциональность скрытия/показа баланса
    initBalanceToggle();
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
    
    // ЗАГРУЖАЕМ USDT БАЛАНС
    loadUsdtBalance();
});

// Функция для инициализации темы
function initTheme() {
    // Устанавливаем только темную тему
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Переключаем иконки для темной темы
    updateEyeIcons();
}

// Функция для обновления иконок глаз
function updateEyeIcons() {
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeIconDark = document.getElementById('eyeIconDark');
    
    if (eyeIcon && eyeIconDark) {
        const isHidden = document.getElementById('balanceAmount')?.classList.contains('hidden');
        
        // Показываем только темную иконку
        eyeIcon.style.display = 'none';
        eyeIconDark.style.display = 'block';
        // Устанавливаем правильную иконку для темной темы
        eyeIconDark.src = isHidden ? 'eye2_white.png' : 'eye_white.png';
    }
}

// Функция для переключения видимости баланса
function initBalanceToggle() {
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeIconDark = document.getElementById('eyeIconDark');
    const balanceAmount = document.getElementById('balanceAmount');
    const detailedBalance = document.querySelector('.usdt-balance');
    
    if (eyeIcon && eyeIconDark && balanceAmount) {
        // Сохраняем оригинальный баланс
        const originalBalance = balanceAmount.textContent;
        const originalDetailedBalance = detailedBalance.textContent;
        
        // Функция для переключения иконок
        function toggleEyeIcons(isHidden) {
            // Только темная тема
            if (isHidden) {
                eyeIconDark.src = 'eye2_white.png';
            } else {
                eyeIconDark.src = 'eye_white.png';
            }
        }
        
        // Обработчик клика для обеих иконок
        const handleEyeClick = function() {
            const isHidden = balanceAmount.classList.contains('hidden');
            
            if (isHidden) {
                // Показываем баланс - БЕРЕМ АКТУАЛЬНЫЕ ЗНАЧЕНИЯ
                const currentBalance = window.currentOriginalBalance || originalBalance;
                const currentDetailedBalance = window.currentOriginalDetailedBalance || originalDetailedBalance;
                
                balanceAmount.textContent = currentBalance;
                balanceAmount.classList.remove('hidden');
                detailedBalance.textContent = currentDetailedBalance;
                toggleEyeIcons(false);
                eyeIcon.classList.remove('hidden');
                eyeIconDark.classList.remove('hidden');
                
                console.log('👁️ ПОКАЗАЛИ БАЛАНС:', currentBalance, currentDetailedBalance);
            } else {
                // Скрываем баланс (показываем точки)
                balanceAmount.textContent = '•••';
                balanceAmount.classList.add('hidden');
                detailedBalance.textContent = '••• USDT';
                toggleEyeIcons(true);
                eyeIcon.classList.add('hidden');
                eyeIconDark.classList.add('hidden');
                
                console.log('👁️ СКРЫЛИ БАЛАНС');
            }
        };
        
        // Добавляем обработчики для обеих иконок
        eyeIcon.addEventListener('click', handleEyeClick);
        eyeIconDark.addEventListener('click', handleEyeClick);
        
        // По умолчанию баланс показан
        balanceAmount.textContent = originalBalance;
        balanceAmount.classList.remove('hidden');
        toggleEyeIcons(false);
        eyeIcon.classList.remove('hidden');
        eyeIconDark.classList.remove('hidden');
    }
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

// Функция для возврата на главную страницу
function goBack() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.location.href = 'index.html';
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
        backButton.onclick = () => window.location.href = 'index.html';
        document.body.appendChild(backButton);
    }
}

// Показываем кнопку назад
goBack();

// ==================== ЗАГРУЗКА USDT БАЛАНСА ====================

async function loadUsdtBalance() {
    try {
        console.log('💰 ЗАГРУЖАЕМ USDT БАЛАНС...');
        
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
        console.log('📊 ПОЛУЧЕН USDT БАЛАНС:', data);
        
        if (data.success && data.balance) {
            updateUsdtDisplay(data.balance);
        } else {
            console.log('⚠️ USDT баланс не найден');
            setDefaultUsdtDisplay();
        }
        
    } catch (error) {
        console.error('💥 ОШИБКА ЗАГРУЗКИ USDT:', error);
        setDefaultUsdtDisplay();
    }
}

// ОБНОВИТЬ ОТОБРАЖЕНИЕ USDT
function updateUsdtDisplay(balance) {
    const balanceElement = document.getElementById('balanceAmount');
    const usdtElement = document.getElementById('usdtBalance');
    
    if (balance.usdt_amount !== undefined && balance.usdt_price !== undefined) {
        // USD стоимость
        const usdValue = balance.usdt_amount * balance.usdt_price;
        if (balanceElement) {
            balanceElement.textContent = `$${usdValue.toFixed(2)}`;
            console.log(`✅ USD СТОИМОСТЬ: $${usdValue.toFixed(2)}`);
        }
        
        // Количество USDT
        if (usdtElement) {
            usdtElement.textContent = `${balance.usdt_amount.toFixed(6)} USDT`;
            console.log(`✅ КОЛИЧЕСТВО USDT: ${balance.usdt_amount.toFixed(6)}`);
        }
        
        // ОБНОВЛЯЕМ ПЕРЕМЕННЫЕ ДЛЯ ГЛАЗИКА
        updateOriginalBalances();
        
    } else {
        console.log('⚠️ НЕТ ДАННЫХ USDT В БАЛАНСЕ');
        setDefaultUsdtDisplay();
    }
}

// ОБНОВИТЬ СОХРАНЕННЫЕ ЗНАЧЕНИЯ ДЛЯ ГЛАЗИКА
function updateOriginalBalances() {
    const balanceElement = document.getElementById('balanceAmount');
    const usdtElement = document.getElementById('usdtBalance');
    
    if (balanceElement && usdtElement) {
        // Обновляем глобальные переменные
        window.currentOriginalBalance = balanceElement.textContent;
        window.currentOriginalDetailedBalance = usdtElement.textContent;
        
        console.log('🔄 ОБНОВЛЕНЫ ЗНАЧЕНИЯ ДЛЯ ГЛАЗИКА:', window.currentOriginalBalance, window.currentOriginalDetailedBalance);
    }
}

// УСТАНОВИТЬ ДЕФОЛТ ЕСЛИ НЕТ ДАННЫХ
function setDefaultUsdtDisplay() {
    const balanceElement = document.getElementById('balanceAmount');
    const usdtElement = document.getElementById('usdtBalance');
    
    if (balanceElement) {
        balanceElement.textContent = '$0.00';
    }
    if (usdtElement) {
        usdtElement.textContent = '0.000000 USDT';
    }
    
    console.log('🔧 УСТАНОВЛЕН ДЕФОЛТ USDT');
}
