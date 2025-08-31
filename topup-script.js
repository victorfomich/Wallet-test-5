// Telegram Web App API
let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Инициализируем функциональность поиска
    initSearch();
    
    // Инициализируем клики по криптовалютам
    initCryptoClicks();
});

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
            const name = this.querySelector('.crypto-name').textContent;
            
            console.log(`Выбрана криптовалюта: ${ticker} (${name})`);
            
            // Здесь можно добавить логику для перехода на страницу пополнения конкретной криптовалюты
            // Например, показать модальное окно или перейти на другую страницу
            
            // Пока что просто показываем уведомление
            if (tg && tg.showAlert) {
                tg.showAlert(`Выбрана криптовалюта: ${ticker}`);
            } else {
                alert(`Выбрана криптовалюта: ${ticker}`);
            }
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
