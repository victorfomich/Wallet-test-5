// Telegram Web App API
let tg = window.Telegram.WebApp;

// Система предзагрузки для мгновенной навигации
const preloadManager = {
    pages: {
        'topup.html': null,
        'usdt.html': null,
        'qr-usdt.html': null,
        'usdt-chain.html': null,
        'withdraw.html': null
    },
    
    // Предзагружаем все страницы
    preloadAllPages() {
        console.log('Начинаем предзагрузку всех страниц...');
        
        Object.keys(this.pages).forEach(page => {
            this.preloadPage(page);
        });
        
        // Предзагружаем все CSS и JS файлы
        this.preloadResources();
    },
    
    // Предзагружаем конкретную страницу
    preloadPage(page) {
        const iframe = document.getElementById(`preload-${page.replace('.html', '')}`);
        if (iframe) {
            iframe.onload = () => {
                console.log(`Страница ${page} предзагружена`);
                this.pages[page] = 'loaded';
            };
        }
    },
    
    // Предзагружаем ресурсы
    preloadResources() {
        const resources = [
            'topup-styles.css',
            'topup-script.js',
            'usdt-styles.css',
            'usdt-script.js',
            'qr-usdt-styles.css',
            'qr-usdt-script.js',
            'usdt-chain-styles.css',
            'usdt-chain-script.js',
            'withdraw-styles.css',
            'withdraw-script.js'
        ];
        
        resources.forEach(resource => {
            if (resource.endsWith('.css')) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = resource;
                link.as = 'style';
                document.head.appendChild(link);
            } else if (resource.endsWith('.js')) {
                const script = document.createElement('script');
                script.src = resource;
                script.async = true;
                document.head.appendChild(script);
            }
        });
    },
    
    // Проверяем готовность страницы
    isPageReady(page) {
        return this.pages[page] === 'loaded';
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Определяем и применяем тему
    initTheme();
    
    // Запускаем предзагрузку всех страниц
    preloadManager.preloadAllPages();
    
    // Получаем данные пользователя
    loadUserData();
});

// Инициализация темы
function initTheme() {
    // Устанавливаем только темную тему
    document.documentElement.setAttribute('data-theme', 'dark');
    console.log('Применена темная тема');
    
    // Переключаем иконки для темной темы
    updateEyeIcons();
    updateScanChipIcons();
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

// Функция для обновления иконок scan и chip
function updateScanChipIcons() {
    const scanLight = document.querySelector('.scan-light');
    const scanDark = document.querySelector('.scan-dark');
    const chipLight = document.querySelector('.chip-light');
    const chipDark = document.querySelector('.chip-dark');
    
    if (scanLight && scanDark && chipLight && chipDark) {
        // Показываем только темные иконки
        scanLight.style.display = 'none';
        scanDark.style.display = 'block';
        chipLight.style.display = 'none';
        chipDark.style.display = 'block';
    }
}

// Загрузка данных пользователя из Telegram и инициализация через UserManager
async function loadUserData() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // Устанавливаем имя пользователя
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.first_name || 'Пользователь';
        }
        
        // Устанавливаем аватар
        const userAvatarElement = document.getElementById('userAvatar');
        if (userAvatarElement && user.photo_url) {
            userAvatarElement.src = user.photo_url;
        } else {
            // Если аватар не загружен, показываем заглушку
            userAvatarElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1zbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM2NDY0NjQiLz4KPHBhdGggZD0iTTMwIDMzQzMyLjc2MTQgMzMgMzUgMzAuNzYxNCAzNSAyOEMzNSAyNS4yMzg2IDMyLjc2MTQgMjMgMzAgMjNDMjcuMjM4NiAyMyAyNSAyNS4yMzg2IDI1IDI4QzI1IDMwLjc2MTQgMjcuMjM4NiAzMyAzMCAzM1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik00MiAzOUM0MiAzNi43OTAxIDQwLjIwOTkgMzUgMzggMzVIMjJDMjAuNzkgMzUgMjAgMzYuNzkgMjAgMzlWNDJDMjAgNDIuNTUyMyAyMC40NDc3IDQzIDIxIDQzSDM5QzM5LjU1MjMgNDMgNDAgNDIuNTUyMyA0MCA0MlYzOVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg==';
        }
        
        console.log('Данные пользователя загружены:', user);
        
        // Инициализируем пользователя через UserManager
        try {
            const success = await window.userManager.initializeUser(user);
            if (success) {
                console.log('Пользователь успешно инициализирован через UserManager');
                // Обновляем интерфейс с учетом пользовательских адресов
                updateUIWithUserData();
            } else {
                console.error('Ошибка инициализации пользователя через UserManager');
                showUserInitializationError();
            }
        } catch (error) {
            console.error('Ошибка при инициализации пользователя:', error);
            showUserInitializationError();
        }
    } else {
        console.log('Данные пользователя недоступны');
        // Показываем заглушку для тестирования
        document.getElementById('userName').textContent = 'user';
        
        // Пытаемся загрузить из localStorage
        const loaded = window.userManager.loadFromLocalStorage();
        if (loaded) {
            console.log('Данные пользователя загружены из localStorage');
            updateUIWithUserData();
        }
    }
    
    // Инициализируем функциональность скрытия/показа баланса
    initBalanceToggle();
}

// Обновление интерфейса с данными пользователя
function updateUIWithUserData() {
    const userStats = window.userManager.getUserStats();
    if (userStats) {
        console.log('Статистика пользователя:', userStats);
        
        // Можно добавить индикатор готовности адресов
        const completionPercentage = userStats.completionPercentage;
        if (completionPercentage < 100) {
            console.warn(`Не все адреса назначены: ${completionPercentage}%`);
        }
    }
}

// Показать ошибку инициализации пользователя
function showUserInitializationError() {
    const container = document.querySelector('.container');
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        background: rgba(220, 53, 69, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        z-index: 1000;
        font-size: 14px;
    `;
    errorMessage.textContent = 'Ошибка загрузки данных пользователя. Попробуйте перезагрузить страницу.';
    container.appendChild(errorMessage);
    
    // Убираем сообщение через 5 секунд
    setTimeout(() => {
        if (errorMessage.parentNode) {
            errorMessage.parentNode.removeChild(errorMessage);
        }
    }, 5000);
}

// Функция для переключения видимости баланса
function initBalanceToggle() {
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeIconDark = document.getElementById('eyeIconDark');
    const balanceAmount = document.getElementById('balanceAmount');
    
    if (eyeIcon && eyeIconDark && balanceAmount) {
        // Сохраняем оригинальный баланс
        const originalBalance = balanceAmount.textContent;
        
        // Функция для переключения иконок
        function toggleEyeIcons(isHidden) {
            const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
            
            if (isDarkTheme) {
                // Темная тема
                if (isHidden) {
                    eyeIconDark.src = 'eye2_white.png';
                } else {
                    eyeIconDark.src = 'eye_white.png';
                }
            } else {
                // Светлая тема
                if (isHidden) {
                    eyeIcon.src = 'eye2.png';
                } else {
                    eyeIcon.src = 'eye.png';
                }
            }
        }
        
        // Обработчик клика для обеих иконок
        const handleEyeClick = function() {
            const isHidden = balanceAmount.classList.contains('hidden');
            
            if (isHidden) {
                // Показываем баланс
                balanceAmount.textContent = originalBalance;
                balanceAmount.classList.remove('hidden');
                toggleEyeIcons(false);
                eyeIcon.classList.remove('hidden');
                eyeIconDark.classList.remove('hidden');
            } else {
                // Скрываем баланс (показываем точки)
                balanceAmount.textContent = '•••';
                balanceAmount.classList.add('hidden');
                toggleEyeIcons(true);
                eyeIcon.classList.add('hidden');
                eyeIconDark.classList.add('hidden');
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
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
    
    // Оптимизируем навигацию
    optimizeNavigation();
}

// Оптимизированная навигация с предзагрузкой
function optimizeNavigation() {
    // Переопределяем стандартную навигацию для мгновенного перехода
    const navButtons = document.querySelectorAll('.nav-button');
    const assetItems = document.querySelectorAll('.asset-item');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Получаем целевой URL из data-атрибута
            const targetUrl = this.getAttribute('data-page');
            
            if (targetUrl && preloadManager.isPageReady(targetUrl)) {
                // Если страница готова, переходим мгновенно
                console.log(`Мгновенный переход на ${targetUrl}`);
                window.location.href = targetUrl;
            } else {
                // Если страница не готова, показываем индикатор загрузки
                showLoadingIndicator();
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 100);
                console.log(`Страница ${targetUrl} не готова, показываем загрузку`);
            }
        });
    });
    
    assetItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetUrl = item.getAttribute('data-page');
            
            if (targetUrl && preloadManager.isPageReady(targetUrl)) {
                console.log(`Мгновенный переход на ${targetUrl}`);
                window.location.href = targetUrl;
            } else {
                showLoadingIndicator();
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 100);
                console.log(`Страница ${targetUrl} не готова, показываем загрузку`);
            }
        });
    });
}

// Показываем индикатор загрузки
function showLoadingIndicator() {
    // Создаем простой индикатор загрузки
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.innerHTML = '<div class="spinner"></div>';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    document.body.appendChild(loader);
    
    // Убираем через 500ms
    setTimeout(() => {
        if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
    }, 500);
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
