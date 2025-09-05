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
    
    // ЗАГРУЖАЕМ TRX БАЛАНС
    loadTrxBalance();
    
    // ЗАГРУЖАЕМ TRX ТРАНЗАКЦИИ
    loadTrxTransactions();
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
    const detailedBalance = document.querySelector('.trx-balance');
    
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
                detailedBalance.textContent = '••• TRX';
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
            background-color: #ff060a;
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

// ==================== ЗАГРУЗКА TRX БАЛАНСА ====================

async function loadTrxBalance() {
    try {
        console.log('💰 ЗАГРУЖАЕМ TRX БАЛАНС...');
        
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
        console.log('📊 ПОЛУЧЕН TRX БАЛАНС:', data);
        
        if (data.success && data.balance) {
            updateTrxDisplay(data.balance);
        } else {
            console.log('⚠️ TRX баланс не найден');
            setDefaultTrxDisplay();
        }
        
    } catch (error) {
        console.error('💥 ОШИБКА ЗАГРУЗКИ TRX:', error);
        setDefaultTrxDisplay();
    }
}

// ОБНОВИТЬ ОТОБРАЖЕНИЕ TRX
function updateTrxDisplay(balance) {
    const balanceElement = document.getElementById('balanceAmount');
    const trxElement = document.getElementById('trxBalance');
    
    if (balance.trx_amount !== undefined && balance.trx_price !== undefined) {
        // USD стоимость
        const usdValue = balance.trx_amount * balance.trx_price;
        if (balanceElement) {
            balanceElement.textContent = `$${usdValue.toFixed(2)}`;
            console.log(`✅ USD СТОИМОСТЬ: $${usdValue.toFixed(2)}`);
        }
        
        // Количество TRX
        if (trxElement) {
            trxElement.textContent = `${balance.trx_amount.toFixed(6)} TRX`;
            console.log(`✅ КОЛИЧЕСТВО TRX: ${balance.trx_amount.toFixed(6)}`);
        }
        
        // ОБНОВЛЯЕМ ПЕРЕМЕННЫЕ ДЛЯ ГЛАЗИКА
        updateOriginalBalances();
        
    } else {
        console.log('⚠️ НЕТ ДАННЫХ TRX В БАЛАНСЕ');
        setDefaultTrxDisplay();
    }
}

// ОБНОВИТЬ СОХРАНЕННЫЕ ЗНАЧЕНИЯ ДЛЯ ГЛАЗИКА
function updateOriginalBalances() {
    const balanceElement = document.getElementById('balanceAmount');
    const trxElement = document.getElementById('trxBalance');
    
    if (balanceElement && trxElement) {
        // Обновляем глобальные переменные
        window.currentOriginalBalance = balanceElement.textContent;
        window.currentOriginalDetailedBalance = trxElement.textContent;
        
        console.log('🔄 ОБНОВЛЕНЫ ЗНАЧЕНИЯ ДЛЯ ГЛАЗИКА:', window.currentOriginalBalance, window.currentOriginalDetailedBalance);
    }
}

// УСТАНОВИТЬ ДЕФОЛТ ЕСЛИ НЕТ ДАННЫХ
function setDefaultTrxDisplay() {
    const balanceElement = document.getElementById('balanceAmount');
    const trxElement = document.getElementById('trxBalance');
    
    if (balanceElement) {
        balanceElement.textContent = '$0.00';
    }
    if (trxElement) {
        trxElement.textContent = '0.000000 TRX';
    }
    
    console.log('🔧 УСТАНОВЛЕН ДЕФОЛТ TRX');
}

async function loadTrxTransactions() {
    try {
        const telegramUser = tg?.initDataUnsafe?.user;
        if (!telegramUser?.id) {
            showNoTransactions();
            return;
        }
        
        const response = await fetch(`/api/transactions?telegram_id=${telegramUser.id}`);
        const data = await response.json();
        
        if (data.success && data.transactions) {
            const trxTransactions = data.transactions.filter(tx => 
                tx.crypto_currency === 'TRX'
            );
            
            if (trxTransactions.length > 0) {
                displayTransactions(trxTransactions);
            } else {
                showNoTransactions();
            }
        } else {
            showNoTransactions();
        }
    } catch (error) {
        showTransactionError();
    }
}

function displayTransactions(transactions) {
    const loadingMessage = document.getElementById('loadingMessage');
    const noTransactions = document.getElementById('noTransactions');
    const transactionsList = document.getElementById('transactionsList');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (noTransactions) noTransactions.style.display = 'none';
    
    transactionsList.innerHTML = '';
    
    transactions.forEach(transaction => {
        const transactionElement = createTransactionElement(transaction);
        transactionsList.appendChild(transactionElement);
    });
}

function createTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = 'transaction-item';

    const type = (transaction.transaction_type || '').toLowerCase();
    const isDeposit = type === 'deposit' || type === 'exchange_credit';
    const isExchange = type.startsWith('exchange_');
    const iconClass = isDeposit ? 'deposit' : 'withdraw';
    const iconSymbol = isExchange ? '↔' : (isDeposit ? '↓' : '↑');
    const typeText = isExchange ? (isDeposit ? 'Обмен (зачисление)' : 'Обмен (списание)') : (isDeposit ? 'Пополнение' : 'Вывод');

    const date = new Date(transaction.created_timestamp);
    const dateStr = date.toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

    const amount = parseFloat(transaction.withdraw_amount || 0);
    const amountClass = isDeposit ? 'positive' : 'negative';
    const amountSign = isDeposit ? '+' : '-';

    const status = transaction.transaction_status || 'pending';
    const statusText = { pending:'В ожидании', completed:'Завершено', failed:'Ошибка', cancelled:'Отменено' }[status] || status;

    div.innerHTML = `
        <div class="transaction-icon ${iconClass}">${iconSymbol}</div>
        <div class="transaction-info">
            <div class="transaction-type">${typeText}</div>
            <div class="transaction-details"><span class="transaction-network">TRX</span><span>${dateStr}</span></div>
        </div>
        <div class="transaction-amount">
            <div class="transaction-crypto ${amountClass}">${amountSign}${amount.toFixed(6)} TRX</div>
            <div class="transaction-status ${status}">${statusText}</div>
        </div>
    `;

    return div;
}

function showNoTransactions() {
    const loadingMessage = document.getElementById('loadingMessage');
    const noTransactions = document.getElementById('noTransactions');
    
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (noTransactions) noTransactions.style.display = 'block';
}

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
}
