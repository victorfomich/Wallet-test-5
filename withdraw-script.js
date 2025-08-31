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
    
    // Инициализируем клики по криптовалютам
    initCryptoClicks();
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
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

// Функция для обработки кликов по криптовалютам
function initCryptoClicks() {
    const cryptoItems = document.querySelectorAll('.crypto-item');
    
    cryptoItems.forEach(item => {
        item.addEventListener('click', function() {
            const cryptoTicker = this.querySelector('.crypto-ticker').textContent;
            const cryptoName = this.querySelector('.crypto-name').textContent;
            
            console.log(`Выбрана криптовалюта: ${cryptoTicker} (${cryptoName})`);
            
            // Здесь можно добавить логику для перехода на страницу пополнения конкретной криптовалюты
            // Например, показать модальное окно или перейти на другую страницу
            
            // Пока что просто показываем уведомление
            if (tg && tg.showAlert) {
                tg.showAlert(`Выбрана криптовалюта: ${cryptoTicker} (${cryptoName})`);
            } else {
                alert(`Выбрана криптовалюта: ${cryptoTicker} (${cryptoName})`);
            }
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
    
    // Отключаем масштабирование на мобильных устройствах
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
    
    // Отключаем зум на мобильных устройствах
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Отключаем зум на двойной тап
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}
