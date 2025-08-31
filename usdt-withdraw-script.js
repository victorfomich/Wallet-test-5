// Telegram Web App API
let tg = window.Telegram.WebApp;

// Глобальные переменные
let currentNetwork = 'ton';
let currentBalance = 0;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded: usdt-withdraw-script.js загружен');
    
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Определяем и применяем тему
    initTheme();
    
    // Инициализируем обработчики
    initEventHandlers();
    
    // Загружаем баланс пользователя
    loadUserBalance();
    
    // Устанавливаем сеть из URL параметров
    initNetworkFromUrl();
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
    
    // Показываем кнопку назад
    initBackButton();
});

// Инициализация темы
function initTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateIcons();
}

// Обновление иконок для темной темы
function updateIcons() {
    const pasteLight = document.querySelector('.paste-light');
    const pasteDark = document.querySelector('.paste-dark');
    
    if (pasteLight && pasteDark) {
        pasteLight.style.display = 'none';
        pasteDark.style.display = 'block';
    }
}

// Инициализация обработчиков событий
function initEventHandlers() {
    // Выбор сети
    const networkSelector = document.getElementById('networkSelector');
    networkSelector.addEventListener('click', showNetworkModal);
    
    // Модальное окно
    const modal = document.getElementById('networkModal');
    const modalClose = document.getElementById('modalClose');
    modalClose.addEventListener('click', hideNetworkModal);
    
    // Клик по overlay для закрытия модального окна
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            hideNetworkModal();
        }
    });
    
    // Выбор сети в модальном окне
    const networkOptions = document.querySelectorAll('.network-option');
    networkOptions.forEach(option => {
        option.addEventListener('click', function() {
            const network = this.dataset.network;
            selectNetwork(network);
            hideNetworkModal();
        });
    });
    
    // Кнопка "Вставить"
    const pasteBtn = document.getElementById('pasteBtn');
    pasteBtn.addEventListener('click', pasteAddress);
    
    // Кнопка "Макс"
    const maxBtn = document.getElementById('maxBtn');
    maxBtn.addEventListener('click', setMaxAmount);
    
    // Добавить комментарий
    const addCommentBtn = document.getElementById('addCommentBtn');
    addCommentBtn.addEventListener('click', toggleComment);
    
    // Кнопка продолжить
    const continueBtn = document.getElementById('continueBtn');
    continueBtn.addEventListener('click', processContinue);
    
    // Валидация полей
    const addressInput = document.getElementById('addressInput');
    const amountInput = document.getElementById('amountInput');
    
    addressInput.addEventListener('input', validateForm);
    amountInput.addEventListener('input', validateForm);
}

// Показать модальное окно выбора сети
function showNetworkModal() {
    const modal = document.getElementById('networkModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Скрыть модальное окно выбора сети
function hideNetworkModal() {
    const modal = document.getElementById('networkModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Выбор сети
function selectNetwork(network) {
    currentNetwork = network;
    
    const networkData = {
        ton: {
            name: 'The Open Network',
            type: 'Сеть',
            fee: '0.1 TON',
            icon: 'toncoin.png',
            iconClass: 'ton-icon'
        },
        tron: {
            name: 'Tron',
            type: 'Сеть',
            fee: '0 TRX',
            icon: 'tron.png',
            iconClass: 'trx-icon'
        },
        sol: {
            name: 'Solana',
            type: 'Сеть',
            fee: '0.01 SOL',
            icon: 'solana.png',
            iconClass: 'sol-icon'
        },
        eth: {
            name: 'Ethereum',
            type: 'Сеть',
            fee: '0.01 ETH',
            icon: 'ethereum.svg',
            iconClass: 'eth-icon'
        },
        bnb: {
            name: 'BNB Smart Chain',
            type: 'Сеть',
            fee: '0.01 BNB',
            icon: 'bnb.webp',
            iconClass: 'bnb-icon'
        }
    };
    
    const data = networkData[network];
    if (data) {
        updateNetworkDisplay(data);
    }
}

// Обновление отображения выбранной сети
function updateNetworkDisplay(data) {
    const networkSelector = document.getElementById('networkSelector');
    
    networkSelector.innerHTML = `
        <div class="network-left">
            <div class="network-icon ${data.iconClass}">
                <img src="${data.icon}" alt="${network}" class="network-logo">
            </div>
            <div class="network-info">
                <div class="network-name">${data.name}</div>
                <div class="network-type">${data.type}</div>
            </div>
        </div>
        <div class="network-right">
            <div class="network-fee">${data.fee}</div>
            <div class="network-fee-label">Комиссия</div>
        </div>
    `;
}

// Вставка адреса из буфера обмена
async function pasteAddress() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('addressInput').value = text;
        validateForm();
        
        if (tg && tg.showAlert) {
            tg.showAlert('Адрес вставлен');
        }
    } catch (err) {
        console.error('Ошибка при вставке из буфера обмена:', err);
        if (tg && tg.showAlert) {
            tg.showAlert('Не удалось получить доступ к буферу обмена');
        }
    }
}

// Установка максимальной суммы
function setMaxAmount() {
    const amountInput = document.getElementById('amountInput');
    amountInput.value = currentBalance.toFixed(8);
    validateForm();
}

// Переключение поля комментария
function toggleComment() {
    const commentContainer = document.getElementById('commentContainer');
    const addCommentBtn = document.getElementById('addCommentBtn');
    
    if (commentContainer.style.display === 'none') {
        commentContainer.style.display = 'block';
        addCommentBtn.textContent = '- Убрать комментарий';
    } else {
        commentContainer.style.display = 'none';
        addCommentBtn.textContent = '+ Добавить комментарий';
        document.getElementById('commentInput').value = '';
    }
}

// Валидация формы
function validateForm() {
    const addressInput = document.getElementById('addressInput');
    const amountInput = document.getElementById('amountInput');
    const continueBtn = document.getElementById('continueBtn');
    
    const hasAddress = addressInput.value.trim().length > 0;
    const hasAmount = amountInput.value && parseFloat(amountInput.value) > 0;
    const isValidAmount = parseFloat(amountInput.value) <= currentBalance;
    
    const isValid = hasAddress && hasAmount && isValidAmount;
    
    continueBtn.disabled = !isValid;
    
    // Показываем ошибки
    if (amountInput.value && !isValidAmount) {
        amountInput.style.borderColor = '#ff4444';
    } else {
        amountInput.style.borderColor = '';
    }
}

// Обработка нажатия "Продолжить"
function processContinue() {
    const addressInput = document.getElementById('addressInput');
    const amountInput = document.getElementById('amountInput');
    const commentInput = document.getElementById('commentInput');
    
    const withdrawData = {
        network: currentNetwork,
        address: addressInput.value.trim(),
        amount: parseFloat(amountInput.value),
        comment: commentInput.value.trim(),
        currency: 'USDT'
    };
    
    console.log('Данные для вывода:', withdrawData);
    
    // Здесь можно добавить логику отправки запроса на вывод
    if (tg && tg.showAlert) {
        tg.showAlert(`Вывод ${withdrawData.amount} USDT на ${withdrawData.network} сеть`);
    } else {
        alert(`Вывод ${withdrawData.amount} USDT на ${withdrawData.network} сеть`);
    }
}

// Загрузка баланса пользователя
async function loadUserBalance() {
    try {
        console.log('Загружаем баланс USDT...');
        
        // Получаем Telegram ID пользователя
        const telegramId = tg?.initDataUnsafe?.user?.id || 'demo_user';
        
        const response = await fetch(`/api/admin/balances?telegram_id=${telegramId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.balance && data.balance.usdt_amount !== undefined) {
            currentBalance = data.balance.usdt_amount;
            updateBalanceDisplay();
        } else {
            currentBalance = 0;
            updateBalanceDisplay();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
        currentBalance = 0;
        updateBalanceDisplay();
    }
}

// Обновление отображения баланса
function updateBalanceDisplay() {
    const balanceAmount = document.querySelector('.balance-amount');
    const balanceUsd = document.querySelector('.balance-usd');
    
    if (balanceAmount) {
        balanceAmount.textContent = `${currentBalance.toFixed(8)} USDT`;
    }
    
    if (balanceUsd) {
        const usdValue = (currentBalance * 1.0).toFixed(3); // Примерный курс USDT = $1
        balanceUsd.textContent = `$${usdValue}`;
    }
}

// Инициализация сети из URL параметров
function initNetworkFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const networkParam = urlParams.get('network');
    
    if (networkParam) {
        selectNetwork(networkParam);
    }
}

// Инициализация кнопки назад
function initBackButton() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.location.href = 'withdraw-usdt-chain.html';
        });
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
