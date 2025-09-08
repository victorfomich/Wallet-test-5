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
    
    // ЗАГРУЖАЕМ USDT ТРАНЗАКЦИИ
    loadUsdtTransactions();
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
            const formatted = Number(usdValue.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            balanceElement.textContent = `$${formatted}`;
            console.log(`✅ USD СТОИМОСТЬ: $${usdValue.toFixed(2)}`);
        }
        
        // Количество USDT
        if (usdtElement) {
            usdtElement.textContent = `${balance.usdt_amount.toFixed(6)} USDT`;
            console.log(`✅ КОЛИЧЕСТВО USDT: ${balance.usdt_amount.toFixed(6)}`);
        }
        
        // ОБНОВЛЯЕМ ПЕРЕМЕННЫЕ ДЛЯ ГЛАЗИКА
        updateOriginalBalances();
        // Сохраняем live цену для транзакций (USDT~$1)
        try {
            window.livePrices = window.livePrices || {};
            window.livePrices.usdt = Number(balance.usdt_price || 1);
        } catch {}
        
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

// ЗАГРУЗКА USDT ТРАНЗАКЦИЙ
async function loadUsdtTransactions() {
    console.log('📊 Начинаем загрузку USDT транзакций...');
    
    try {
        // Получаем telegram_id пользователя
        const telegramUser = tg?.initDataUnsafe?.user;
        if (!telegramUser?.id) {
            console.warn('📊 Telegram пользователь не найден для загрузки транзакций');
            showNoTransactions();
            return;
        }
        
        const telegramId = telegramUser.id;
        console.log('📊 Загружаем транзакции для пользователя:', telegramId);
        
        // Запрос к API транзакций
        const response = await fetch(`/api/transactions?telegram_id=${telegramId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Ответ API транзакций:', data);
        
        if (data.success && data.transactions) {
            // Фильтруем только USDT транзакции (включая обмен)
            const usdtTransactions = data.transactions.filter(tx => 
                tx.crypto_currency === 'USDT'
            );
            
            console.log('📊 Найдено USDT транзакций:', usdtTransactions.length);
            
            if (usdtTransactions.length > 0) {
                displayTransactions(usdtTransactions);
            } else {
                showNoTransactions();
            }
        } else {
            console.warn('📊 Нет данных о транзакциях');
            showNoTransactions();
        }
        
    } catch (error) {
        console.error('📊 Ошибка загрузки USDT транзакций:', error);
        showTransactionError();
    }
}

// ОТОБРАЖЕНИЕ ТРАНЗАКЦИЙ С ГРУППИРОВКОЙ ПО ДАТАМ
function displayTransactions(transactions) {
    const loadingMessage = document.getElementById('loadingMessage');
    const noTransactions = document.getElementById('noTransactions');
    const transactionsList = document.getElementById('transactionsList');
    
    // Скрываем загрузку и "нет транзакций"
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (noTransactions) noTransactions.style.display = 'none';
    
    // Очищаем список
    transactionsList.innerHTML = '';
    
    // Группируем транзакции по датам
    const groupedTransactions = groupTransactionsByDate(transactions);
    
    // Создаем группы с заголовками дат
    Object.keys(groupedTransactions).forEach(dateKey => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'transaction-date-group';
        
        // Заголовок даты
        const dateHeader = document.createElement('div');
        dateHeader.className = 'transaction-date-header';
        dateHeader.textContent = dateKey;
        dateGroup.appendChild(dateHeader);
        
        // Транзакции этой даты
        groupedTransactions[dateKey].forEach(transaction => {
            const transactionElement = createTransactionElement(transaction);
            dateGroup.appendChild(transactionElement);
        });
        
        transactionsList.appendChild(dateGroup);
    });
    
    console.log('📊 Отображено транзакций:', transactions.length);
}

// ГРУППИРОВКА ТРАНЗАКЦИЙ ПО ДАТАМ
function groupTransactionsByDate(transactions) {
    const groups = {};
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.created_timestamp);
        const dateKey = formatDateHeader(date);
        
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(transaction);
    });
    
    return groups;
}

// ФОРМАТИРОВАНИЕ ЗАГОЛОВКА ДАТЫ
function formatDateHeader(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today - transactionDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'СЕГОДНЯ';
    } else if (diffDays === 1) {
        return 'ВЧЕРА';
    } else {
        const months = [
            'ЯНВАРЯ', 'ФЕВРАЛЯ', 'МАРТА', 'АПРЕЛЯ', 'МАЯ', 'ИЮНЯ',
            'ИЮЛЯ', 'АВГУСТА', 'СЕНТЯБРЯ', 'ОКТЯБРЯ', 'НОЯБРЯ', 'ДЕКАБРЯ'
        ];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }
}

// СОЗДАНИЕ ЭЛЕМЕНТА ТРАНЗАКЦИИ В НОВОМ СТИЛЕ
function createTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    
    // Определяем тип транзакции (учитываем обмен)
    const type = (transaction.transaction_type || '').toLowerCase();
    const isDeposit = type === 'deposit' || type === 'exchange_credit';
    const isExchange = type.startsWith('exchange_');
    
    // Определяем класс иконки и символ
    let iconClass = 'withdraw';
    let iconSymbol = '↗';
    let typeText = 'Вывод';
    
    if (isExchange) {
        iconClass = 'exchange';
        iconSymbol = '↔';
        typeText = isDeposit ? 'Обмен (зачисление)' : 'Обмен (списание)';
    } else if (isDeposit) {
        iconClass = 'deposit';
        iconSymbol = '↙';
        typeText = 'Пополнение';
    }
    
    // Форматируем время
    const date = new Date(transaction.created_timestamp);
    const timeStr = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Определяем сумму и знак
    const amount = parseFloat(transaction.withdraw_amount || 0);
    const amountClass = isDeposit ? 'positive' : 'negative';
    const amountSign = isDeposit ? '+' : '-';
    
    // Рассчитываем USD эквивалент (используем цену из livePrices, дефолт $1)
    const usdtPrice = (window.livePrices && Number(window.livePrices.usdt)) || 1.0;
    const usdAmount = amount * usdtPrice;
    
    div.innerHTML = `
        <div class="transaction-icon ${iconClass}">
            ${iconSymbol}
        </div>
        <div class="transaction-info">
            <div class="transaction-type">${typeText}</div>
            <div class="transaction-time">${timeStr}</div>
        </div>
        <div class="transaction-amount">
            <div class="transaction-crypto ${amountClass}">
                ${amountSign}${amount.toFixed(2)} USDT
            </div>
            <div class="transaction-usd">
                $${usdAmount.toFixed(2)}
            </div>
        </div>
    `;
    
    return div;
}

// ПОКАЗАТЬ "НЕТ ТРАНЗАКЦИЙ"
function showNoTransactions() {
    const loadingMessage = document.getElementById('loadingMessage');
    const noTransactions = document.getElementById('noTransactions');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (noTransactions) noTransactions.style.display = 'block';
    
    console.log('📊 Показано сообщение "Нет транзакций"');
}

// ПОКАЗАТЬ ОШИБКУ ЗАГРУЗКИ ТРАНЗАКЦИЙ
function showTransactionError() {
    const loadingMessage = document.getElementById('loadingMessage');
    const transactionsList = document.getElementById('transactionsList');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'no-transactions';
    errorDiv.innerHTML = `
        <div class="no-transactions-icon">⚠️</div>
        <div class="no-transactions-text">Ошибка загрузки</div>
        <div class="no-transactions-subtitle">Не удалось загрузить транзакции</div>
    `;
    
    transactionsList.innerHTML = '';
    transactionsList.appendChild(errorDiv);
    
    console.log('📊 Показана ошибка загрузки транзакций');
}
