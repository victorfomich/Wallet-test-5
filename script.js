// Telegram Web App API
let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    tg.ready();
    
    // Устанавливаем основную тему
    tg.expand();
    
    // Получаем данные пользователя
    loadUserData();
    
    // Инициализируем переключатель темы
    initThemeToggle();
    
    // Добавляем обработчики для карточек функций
    initFeatureCards();
});

// Загрузка данных пользователя из Telegram
function loadUserData() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // Устанавливаем имя пользователя
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.first_name || 'Пользователь';
        }
        
        // Устанавливаем username
        const userUsernameElement = document.getElementById('userUsername');
        if (userUsernameElement) {
            userUsernameElement.textContent = user.username ? `@${user.username}` : 'Без username';
        }
        
        // Устанавливаем аватар
        const userAvatarElement = document.getElementById('userAvatar');
        if (userAvatarElement && user.photo_url) {
            userAvatarElement.src = user.photo_url;
        } else {
            // Если аватар не загружен, показываем заглушку
            userAvatarElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM2NDY0NjQiLz4KPHBhdGggZD0iTTQwIDQ0QzQ0LjQxODMgNDQgNDggNDAuNDE4MyA0OCAzNkM0OCAzMS41ODE3IDQ0LjQxODMgMjggNDAgMjhDMzUuNTgxNyAyOCAzMiAzMS41ODE3IDMyIDM2QzMyIDQwLjQxODMgMzUuNTgxNyA0NCA0MCA0NFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik01NiA1MkM1NiA0OC42ODYzIDUyLjY4NjMgNDYgNDggNDZIMzJDMTkuMzcyIDQ2IDkgNTYuMzcyIDkgNjlWNzJDNyAzNDQuNjI3IDcuMzQ0NjMgMzQ1IDggMzQ1SDcyQzcyLjY1NTQgMzQ1IDczIDM0NC42NTUgNzMgMzQ0VjY5QzczIDU2LjM3MiA2Mi42MjggNDYgNTAgNDZINjBDNTYuNjg2MyA0NiA1NiA0OC42ODYzIDU2IDUyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';
        }
        
        // Логируем информацию о пользователе
        console.log('Данные пользователя загружены:', user);
    } else {
        console.log('Данные пользователя недоступны');
        // Показываем заглушку для тестирования
        document.getElementById('userName').textContent = 'Тестовый пользователь';
        document.getElementById('userUsername').textContent = '@test_user';
    }
}

// Инициализация переключателя темы
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    // Проверяем текущую тему
    let currentTheme = localStorage.getItem('theme') || 'auto';
    
    // Применяем тему
    applyTheme(currentTheme);
    
    // Обработчик клика по кнопке
    themeToggle.addEventListener('click', function() {
        // Переключаем темы по кругу: auto -> light -> dark -> auto
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        currentTheme = themes[nextIndex];
        
        // Сохраняем выбор пользователя
        localStorage.setItem('theme', currentTheme);
        
        // Применяем новую тему
        applyTheme(currentTheme);
    });
}

// Применение темы
function applyTheme(theme) {
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (theme === 'auto') {
        // Автоматическая тема на основе системных настроек
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        themeIcon.textContent = '🔄';
        themeText.textContent = 'Авто';
    } else if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Светлая тема';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Темная тема';
    }
    
    // Уведомляем Telegram о смене темы
    if (tg.setHeaderColor) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        tg.setHeaderColor(isDark ? '#1a1a1a' : '#ffffff');
    }
}

// Инициализация карточек функций
function initFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach((card, index) => {
        card.addEventListener('click', function() {
            // Анимация нажатия
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
            
            // Обработка различных функций
            switch(index) {
                case 0: // Баланс
                    showFeature('Баланс', 'Функция проверки баланса');
                    break;
                case 1: // Отправить
                    showFeature('Отправить', 'Функция отправки средств');
                    break;
                case 2: // Получить
                    showFeature('Получить', 'Функция получения средств');
                    break;
                case 3: // История
                    showFeature('История', 'Функция просмотра истории транзакций');
                    break;
            }
        });
    });
}

// Показ информации о функции
function showFeature(title, description) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'feature-notification';
    notification.innerHTML = `
        <h3>${title}</h3>
        <p>${description}</p>
        <button onclick="this.parentElement.remove()">Закрыть</button>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        box-shadow: var(--shadow);
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Слушатель изменения системной темы
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'auto') {
        applyTheme('auto');
    }
});

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Ошибка в приложении:', e.error);
});

// Обработка необработанных промисов
window.addEventListener('unhandledrejection', function(e) {
    console.error('Необработанная ошибка промиса:', e.reason);
});

// Экспорт функций для использования в консоли браузера
window.DreamWallet = {
    loadUserData,
    applyTheme,
    showFeature
};
