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
    
    // Инициализируем функциональность поиска
    initSearch();
    
    // Инициализируем клики по криптовалютам
    initCryptoClicks();
});

// Инициализация темы
function initTheme() {
    // Устанавливаем только темную тему
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Переключаем иконки для темной темы
    updateSearchIcons();
}

// Функция для обновления иконок поиска
function updateSearchIcons() {
    const searchLight = document.querySelector('.search-light');
    const searchDark = document.querySelector('.search-dark');
    
    if (searchLight && searchDark) {
        // Показываем только темную иконку
        searchLight.style.display = 'none';
        searchDark.style.display = 'block';
    }
}

// Функция для поиска криптовалют
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const cryptoItems = document.querySelectorAll('.crypto-item');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase().trim();
            
            cryptoItems.forEach(item => {
                const ticker = item.querySelector('.crypto-ticker').textContent.toLowerCase();
                const name = item.querySelector('.crypto-name').textContent.toLowerCase();
                
                if (ticker.includes(searchTerm) || name.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

// Функция для обработки кликов по криптовалютам
function initCryptoClicks() {
    const cryptoItems = document.querySelectorAll('.crypto-item');
    
    cryptoItems.forEach(item => {
        item.addEventListener('click', function() {
            const ticker = this.querySelector('.crypto-ticker').textContent;
            // без уведомлений — просто переходим на соответствующую страницу пополнения
            const map = { USDT: 'usdt.html', ETH: 'eth.html', TON: 'ton.html', SOL: 'sol.html', TRX: 'trx.html' };
            const target = map[ticker.toUpperCase()] || 'usdt.html';
            window.location.href = target;
        });
    });
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

// Инициализируем ограничения приложения
initAppRestrictions();

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
