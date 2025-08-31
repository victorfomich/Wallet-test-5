// Telegram Web App API
let tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Получаем данные пользователя
    loadUserData();
});

// Загрузка данных пользователя из Telegram
function loadUserData() {
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
    } else {
        console.log('Данные пользователя недоступны');
        // Показываем заглушку для тестирования
        document.getElementById('userName').textContent = 'Виктор';
    }
    
    // Инициализируем функциональность скрытия/показа баланса
    initBalanceToggle();
}

// Функция для переключения видимости баланса
function initBalanceToggle() {
    const eyeIcon = document.getElementById('eyeIcon');
    const balanceAmount = document.getElementById('balanceAmount');
    
    if (eyeIcon && balanceAmount) {
        // Сохраняем оригинальный баланс
        const originalBalance = balanceAmount.textContent;
        
        eyeIcon.addEventListener('click', function() {
            const isHidden = balanceAmount.classList.contains('hidden');
            
            if (isHidden) {
                // Показываем баланс
                balanceAmount.textContent = originalBalance;
                balanceAmount.classList.remove('hidden');
                eyeIcon.src = 'eye.png';
                eyeIcon.classList.remove('hidden');
            } else {
                // Скрываем баланс (показываем точки)
                balanceAmount.textContent = '•••';
                balanceAmount.classList.add('hidden');
                eyeIcon.src = 'eye2.png';
                eyeIcon.classList.add('hidden');
            }
        });
        
        // По умолчанию баланс скрыт (показываем точки)
        balanceAmount.textContent = '•••';
        balanceAmount.classList.add('hidden');
        eyeIcon.src = 'eye2.png';
        eyeIcon.classList.add('hidden');
    }
}
