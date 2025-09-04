// Telegram Web App API
let tg = window.Telegram.WebApp;

// Глобальные переменные
let currentNetwork = 'ton';
let currentBalance = 0;
let networkFees = { ton: 0, tron: 0, sol: 0, eth: 0, bnb: 0 }; // комиссии из админки (в нативной монете)
let networkPricesUsd = { ton: 0, tron: 0, sol: 0, eth: 0, bnb: 0 }; // цены монет из баланса
const NETWORK_SYMBOLS = { ton: 'TON', tron: 'TRX', sol: 'SOL', eth: 'ETH', bnb: 'BNB' };

// Данные о сетях
const NETWORK_DATA = {
    ton: {
        name: 'The Open Network',
        type: 'Сеть',
        fee: '0 TON',
        icon: 'toncoin.png',
        iconClass: 'ton-icon',
        feeAmount: 0,
        feeCurrency: 'TON'
    },
    tron: {
        name: 'Tron',
        type: 'Сеть',
        fee: '0 TRX',
        icon: 'tron.png',
        iconClass: 'trx-icon',
        feeAmount: 0,
        feeCurrency: 'TRX'
    },
    sol: {
        name: 'Solana',
        type: 'Сеть',
        fee: '0 SOL',
        icon: 'solana.png',
        iconClass: 'sol-icon',
        feeAmount: 0,
        feeCurrency: 'SOL'
    },
    eth: {
        name: 'Ethereum',
        type: 'Сеть',
        fee: '0 ETH',
        icon: 'ethereum.svg',
        iconClass: 'eth-icon',
        feeAmount: 0,
        feeCurrency: 'ETH'
    },
    bnb: {
        name: 'BNB Smart Chain',
        type: 'Сеть',
        fee: '0 BNB',
        icon: 'bnb.webp',
        iconClass: 'bnb-icon',
        feeAmount: 0,
        feeCurrency: 'BNB'
    }
};

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
    
    // Загружаем настройки комиссий и баланс/цены
    Promise.all([fetchAndApplySettings(), loadUserBalance()]).then(() => {
        // После загрузки данных обновляем комиссию и UI
        updateNetworkDataFromState();
        updateNetworkDisplay(getCurrentNetworkInfo());
        updateNetworkOptionsFees();
        updateFeeInfo();
    }).catch(() => {
        updateFeeInfo();
    });
    
    // Устанавливаем сеть из URL параметров
    initNetworkFromUrl();
    
    // Обновляем placeholder для адреса
    updateAddressPlaceholder();
    
    // Обновляем информацию о комиссии
    // (вызов перенесён после загрузки настроек)
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
    
    // Показываем кнопку назад
    initBackButton();
});

// Загрузка комиссий из API админки
async function fetchAndApplySettings() {
    try {
        const resp = await fetch('/api/admin/settings');
        const data = await resp.json();
        if (resp.ok && data && data.success && Array.isArray(data.settings)) {
            const map = {};
            data.settings.forEach(s => {
                if (s && typeof s.network === 'string') {
                    const n = s.network.toLowerCase();
                    const feeNum = parseFloat(s.fee) || 0;
                    map[n] = feeNum;
                }
            });
            networkFees = { ...networkFees, ...map };
            updateNetworkDataFromState();
        }
    } catch (e) {
        console.warn('Не удалось загрузить комиссии настроек', e);
    }
}

function updateNetworkDataFromState() {
    Object.keys(NETWORK_DATA).forEach(n => {
        const fee = parseFloat(networkFees[n] || 0) || 0;
        NETWORK_DATA[n].feeAmount = fee;
        NETWORK_DATA[n].fee = `${fee} ${NETWORK_SYMBOLS[n]}`;
    });
}

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
    
    // Реагируем на ввод адреса и суммы
    addressInput.addEventListener('input', function() {
        validateForm();
    });
    amountInput.addEventListener('input', function() {
        validateForm();
        updateFeeInfo(); // Обновляем информацию о комиссии
    });
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
    
    const data = NETWORK_DATA[network];
    if (data) {
        updateNetworkDisplay(data);
        updateAddressPlaceholder(); // Обновляем placeholder для адреса
        updateFeeInfo(); // Обновляем информацию о комиссии
        console.log(`🌐 Сеть изменена на: ${data.name} (${network})`);
    }
}

// Обновление отображения выбранной сети
function updateNetworkDisplay(data) {
    const networkSelector = document.getElementById('networkSelector');
    
    networkSelector.innerHTML = `
        <div class="network-left">
            <div class="network-icon ${data.iconClass}">
                <img src="${data.icon}" alt="${data.name}" class="network-logo">
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
    
    // Восстанавливаем обработчик клика после обновления HTML
    networkSelector.addEventListener('click', showNetworkModal);
}

function updateNetworkOptionsFees() {
    const options = document.querySelectorAll('.network-option');
    options.forEach(opt => {
        const net = opt.getAttribute('data-network');
        const feeInfo = opt.querySelector('.network-fee-info');
        if (net && feeInfo && NETWORK_DATA[net]) {
            feeInfo.textContent = NETWORK_DATA[net].fee;
        }
    });
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
    const feeNative = parseFloat(NETWORK_DATA[currentNetwork].feeAmount || 0) || 0;
    const feeUsd = feeNative * getNetworkUsdPrice(currentNetwork);
    const maxNet = Math.max(0, currentBalance - (feeUsd || 0));
    amountInput.value = maxNet.toFixed(8);
    validateForm();
}

// Получение текущей комиссии сети
function getCurrentNetworkFee() {
    const networkData = NETWORK_DATA[currentNetwork];
    return networkData ? networkData.fee : '0';
}

// Получение информации о текущей сети
function getCurrentNetworkInfo() {
    return NETWORK_DATA[currentNetwork] || NETWORK_DATA.ton;
}

// Валидация адреса в зависимости от сети
function validateAddressForNetwork(address, network) {
    const patterns = {
        ton: /^EQ[a-zA-Z0-9]{48}$/,
        tron: /^T[a-zA-Z0-9]{33}$/,
        sol: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
        eth: /^0x[a-fA-F0-9]{40}$/,
        bnb: /^0x[a-fA-F0-9]{40}$/
    };
    
    const pattern = patterns[network];
    if (!pattern) return true; // Если сеть не поддерживается, пропускаем
    
    return pattern.test(address);
}

// Обновление placeholder для адреса в зависимости от сети
function updateAddressPlaceholder() {
    const addressInput = document.getElementById('addressInput');
    const networkInfo = getCurrentNetworkInfo();
    
    const placeholders = {
        ton: 'EQD4FPq-PRDieyQKkizFTRtSD...',
        tron: 'TR7NHqjeKQxGTCi8q8ZY4p...',
        sol: 'EPjFWdd5AufqSSqeM2qN1x...',
        eth: '0xdAC17F958D2ee523a2206206...',
        bnb: '0x55d398326f99059fF775485246...'
    };
    
    addressInput.placeholder = placeholders[currentNetwork] || 'Адрес';
}

// Обновление информации о комиссии
function updateFeeInfo() {
    const networkFeeElement = document.getElementById('networkFee');
    const totalAmountElement = document.getElementById('totalAmount');
    
    if (networkFeeElement && totalAmountElement) {
        const networkInfo = getCurrentNetworkInfo();
        const amount = parseFloat(document.getElementById('amountInput').value) || 0;

        // комиссия сети в нативной монете (например TON)
        const feeNative = parseFloat(networkInfo.feeAmount || 0) || 0;
        // цена нативной монеты в USD — возьмем из балансов (если есть). Для USDT достаточно цены TON из index (балансы)
        const priceUsd = getNetworkUsdPrice(currentNetwork);

        // Конвертируем комиссию в USD
        const feeUsd = feeNative * priceUsd;
        // Требуемая сумма USDT с учетом USD-комиссии
        const requiredUsdt = amount + feeUsd; // USDT ~ $1
        
        networkFeeElement.textContent = `${feeNative} ${NETWORK_SYMBOLS[currentNetwork]}`;
        totalAmountElement.textContent = `${requiredUsdt.toFixed(8)} USDT`;
    }
}

function getNetworkUsdPrice(network) {
    // Пытаемся использовать последние известные цены из user balance загрузки
    // Если недоступно — вернем 0 для безопасного поведения
    switch (network) {
        case 'ton': return parseFloat(window.__balance_prices?.ton_price || 0) || 0;
        case 'tron': return parseFloat(window.__balance_prices?.trx_price || 0) || 0;
        case 'sol': return parseFloat(window.__balance_prices?.sol_price || 0) || 0;
        case 'eth': return parseFloat(window.__balance_prices?.eth_price || 0) || 0;
        case 'bnb': return 0; // в балансах нет цены BNB, можно расширить позже
        default: return 0;
    }
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
    const netAmount = parseFloat(amountInput.value) || 0;
    const feeUsd = (NETWORK_DATA[currentNetwork].feeAmount || 0) * getNetworkUsdPrice(currentNetwork);
    const requiredUsdt = netAmount + (feeUsd || 0);
    const isValidAmount = requiredUsdt <= currentBalance && netAmount > 0;
    
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
    // Вызываем новую функцию обработки вывода
    handleWithdraw();
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
        
        if (data.success && data.balance) {
            currentBalance = data.balance.usdt_amount ?? 0;
            // Сохраняем цены для конвертации комиссий в USD
            window.__balance_prices = {
                ton_price: data.balance.ton_price,
                trx_price: data.balance.trx_price,
                sol_price: data.balance.sol_price,
                eth_price: data.balance.eth_price
            };
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
    // Перепроверяем форму после загрузки баланса
    validateForm();
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

// ==================== ОБРАБОТКА ВЫВОДА USDT ====================

// Функция для обработки нажатия кнопки "Продолжить"
async function handleWithdraw() {
    try {
        console.log('💸 Начинаем процесс вывода USDT...');
        
        // Получаем данные формы
        const address = document.getElementById('addressInput').value.trim();
        const amount = parseFloat(document.getElementById('amountInput').value);
        const comment = document.getElementById('commentInput').value.trim();
        
        // Валидация
        if (!address) {
            alert('Введите адрес получателя');
            return;
        }
        
        if (!amount || amount <= 0) {
            alert('Введите корректную сумму');
            return;
        }
        
        if (amount > currentBalance) {
            alert(`Недостаточно средств. Ваш баланс: ${currentBalance} USDT`);
            return;
        }
        
        if (amount < 1) {
            alert('Минимальная сумма для вывода: 1 USDT');
            return;
        }
        
        // Адрес принимаем в любом формате, без проверки шаблона
        
        // Получаем Telegram ID
        let telegramId = currentTelegramId;
        if (!telegramId) {
            if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
                telegramId = tg.initDataUnsafe.user.id;
            } else {
                telegramId = 123456789; // Тестовый ID
            }
        }
        
        // Блокируем кнопку
        const continueBtn = document.getElementById('continueBtn');
        const originalText = continueBtn.textContent;
        continueBtn.disabled = true;
        continueBtn.textContent = 'Обработка...';
        
        // Определяем комиссию по сети
        const currentNetworkInfo = getCurrentNetworkInfo();
        const fee = currentNetworkInfo.feeAmount || 0; // в нативной монете сети
        // Вычисляем необходимую сумму USDT с учетом USD-эквивалента комиссии сети
        const feeUsd = fee * getNetworkUsdPrice(currentNetwork);
        const requiredUsdt = amount + feeUsd;
        if (requiredUsdt > currentBalance) {
            alert(`Недостаточно средств с учетом комиссии сети. Нужно как минимум ${requiredUsdt.toFixed(8)} USDT`);
            return;
        }
        
        // Отправляем запрос на создание транзакции
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegram_id: telegramId,
                type: 'withdraw',
                crypto: 'USDT',
                network: currentNetwork,
                amount: requiredUsdt,
                fee: feeUsd,
                address: address,
                comment: comment || null
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log('✅ ТРАНЗАКЦИЯ СОЗДАНА:', result);
            
            // Обновляем баланс в интерфейсе
            currentBalance = result.new_balance;
            updateBalanceDisplay();
            
            // Показываем успешное сообщение (с учетом комиссии сети)
            alert(`Транзакция на вывод ${requiredUsdt.toFixed(8)} USDT (вкл. комиссию сети) создана!\nНовый баланс: ${result.new_balance} USDT\nСтатус: В обработке`);
            
            // Очищаем форму
            document.getElementById('addressInput').value = '';
            document.getElementById('amountInput').value = '';
            document.getElementById('commentInput').value = '';
            
            // Возвращаемся на предыдущую страницу
            setTimeout(() => {
                window.location.href = 'withdraw-usdt-chain.html';
            }, 2000);
            
        } else {
            console.error('❌ ОШИБКА СОЗДАНИЯ ТРАНЗАКЦИИ:', result);
            alert(`Ошибка: ${result.error || 'Неизвестная ошибка'}`);
        }
        
    } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА ВЫВОДА:', error);
        alert('Произошла ошибка при создании транзакции');
    } finally {
        // Разблокируем кнопку
        const continueBtn = document.getElementById('continueBtn');
        continueBtn.disabled = false;
        continueBtn.textContent = 'Продолжить';
    }
}

// Добавляем глобальную переменную для telegram ID
let currentTelegramId = null;
