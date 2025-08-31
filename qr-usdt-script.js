// Telegram Web App API
let tg = window.Telegram.WebApp;

// Глобальные переменные
let selectedNetwork = null;
let qrCode = null;

// Проверяем загрузку библиотеки QR кода
console.log('QRCodeStyling загружен:', typeof QRCodeStyling !== 'undefined');
if (typeof QRCodeStyling === 'undefined') {
    console.error('Библиотека QRCodeStyling не загружена!');
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram Web App
    if (tg && tg.ready) {
        tg.ready();
    }
    
    // Определяем и применяем тему
    initTheme();
    
    // Проверяем, есть ли сеть в URL параметрах
    const urlParams = new URLSearchParams(window.location.search);
    const networkFromUrl = urlParams.get('network');
    
    if (networkFromUrl) {
        // Автоматически выбираем сеть из URL
        selectNetwork(networkFromUrl);
    } else {
        // Если сеть не выбрана, скрываем элементы
        document.getElementById('qrCard').style.display = 'none';
        document.getElementById('addressInfo').style.display = 'none';
        document.getElementById('topupButton').style.display = 'none';
        
        // Показываем сообщение
        const container = document.querySelector('.container');
        const message = document.createElement('div');
        message.style.cssText = 'text-align: center; padding: 40px; color: var(--text-secondary); font-size: 16px;';
        message.textContent = 'Выберите сеть на странице выбора';
        container.appendChild(message);
    }
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
});

// Инициализация темы
function initTheme() {
    // Проверяем системную тему
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Проверяем тему Telegram
    let telegramTheme = 'light';
    if (tg && tg.colorScheme) {
        telegramTheme = tg.colorScheme;
    }
    
    // Применяем тему
    if (prefersDark || telegramTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        console.log('Применена темная тема');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        console.log('Применена светлая тема');
    }
    
    // Слушаем изменения системной темы
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
        if (e.matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        updateCopyIcons();
    });
    
    // Переключаем иконки копирования при смене темы
    updateCopyIcons();
}

// Функция для обновления иконок копирования
function updateCopyIcons() {
    const copyLight = document.querySelector('.copy-light');
    const copyDark = document.querySelector('.copy-dark');
    
    if (copyLight && copyDark) {
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        
        if (isDarkTheme) {
            copyLight.style.display = 'none';
            copyDark.style.display = 'block';
            // Сбрасываем opacity для плавного появления
            copyDark.style.opacity = '0.3';
        } else {
            copyLight.style.display = 'block';
            copyDark.style.display = 'none';
            // Сбрасываем opacity для плавного появления
            copyLight.style.opacity = '0.3';
        }
    }
}



// Функция для выбора конкретной сети
function selectNetwork(network) {
    selectedNetwork = network;
    
    // Получаем информацию о сети из adreses.js
    const networkInfo = getAddress(network);
    
    if (networkInfo) {
        // Показываем QR карточку
        showQRCard(networkInfo);
        
        // Показываем информацию об адресе
        showAddressInfo(networkInfo);
        
        // Показываем кнопку пополнения
        showTopupButton();
    }
}

// Функция для показа QR карточки
function showQRCard(networkInfo) {
    const qrContainer = document.getElementById('qrContainer');
    const networkLogoSmall = document.getElementById('networkLogoSmall');
    const networkNameText = document.getElementById('networkNameText');
    
    // Обновляем название сети
    networkNameText.textContent = networkInfo.name;
    
    // Обновляем логотип сети
    networkLogoSmall.innerHTML = `<img src="${networkInfo.icon}" alt="${networkInfo.name}" style="width: 20px; height: 20px; object-fit: contain;">`;
    
    // Генерируем QR код
    generateQRCode(networkInfo.address, networkInfo);
}

// Функция для генерации QR кода
function generateQRCode(address, networkInfo) {
    const qrContainer = document.getElementById('qrContainer');
    
    // Очищаем контейнер
    qrContainer.innerHTML = '';
    
    // Создаем QR код с помощью библиотеки qr-code-styling
    const qrCodeOptions = {
        width: 240,
        height: 240,
        type: "svg",
        data: address,
        image: networkInfo.icon,
        dotsOptions: {
            color: networkInfo.color,
            type: "rounded"
        },
        backgroundOptions: {
            color: "#ffffff"
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 10
        },
        cornersSquareOptions: {
            color: networkInfo.color,
            type: "extra-rounded"
        },
        cornersDotOptions: {
            color: networkInfo.color,
            type: "dot"
        }
    };
    
    try {
        console.log('Попытка создания QR кода с параметрами:', qrCodeOptions);
        console.log('QRCodeStyling доступен:', typeof QRCodeStyling);
        
        qrCode = new QRCodeStyling(qrCodeOptions);
        console.log('QR код создан успешно:', qrCode);
        
        qrCode.append(qrContainer);
        console.log('QR код добавлен в контейнер');
    } catch (error) {
        console.error('Ошибка генерации QR кода:', error);
        // Fallback - простой QR код
        qrContainer.innerHTML = `<div style="width: 200px; height: 200px; background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
            <div style="text-align: center; color: #666;">
                <div style="font-size: 24px; margin-bottom: 8px;">📱</div>
                <div style="font-size: 12px;">QR код</div>
                <div style="font-size: 10px; margin-top: 4px;">${networkInfo.name}</div>
            </div>
        </div>`;
    }
}

// Функция для показа информации об адресе
function showAddressInfo(networkInfo) {
    const addressText = document.getElementById('addressText');
    const addressDisplay = document.getElementById('addressDisplay');
    
    // Обновляем адрес в основном блоке
    addressText.textContent = networkInfo.address;
    
    // Обновляем адрес в кнопке пополнения
    addressDisplay.textContent = networkInfo.address;
}

// Функция для показа кнопки пополнения
function showTopupButton() {
    // Кнопка уже видна по умолчанию
}

// Функция для копирования адреса
function copyAddress() {
    if (selectedNetwork) {
        const networkInfo = getAddress(selectedNetwork);
        if (networkInfo) {
            // Анимация копирования
            const copyIcon = document.querySelector('.copy-icon');
            const copyLight = copyIcon.querySelector('.copy-light');
            const copyDark = copyIcon.querySelector('.copy-dark');
            const checkmark = copyIcon.querySelector('.checkmark');
            
            // Определяем какая иконка активна
            const activeIcon = copyIcon.querySelector('.copy-light').style.display !== 'none' ? copyLight : copyDark;
            
            // Скрываем активную иконку
            activeIcon.style.opacity = '0';
            
            // Показываем галочку
            setTimeout(() => {
                checkmark.style.opacity = '1';
                checkmark.classList.add('visible');
            }, 200);
            
            // Скрываем галочку через 1.5 секунды и показываем активную иконку
            setTimeout(() => {
                checkmark.style.opacity = '0';
                checkmark.classList.remove('visible');
                setTimeout(() => {
                    activeIcon.style.opacity = '0.3';
                }, 200);
            }, 1700);
            
            navigator.clipboard.writeText(networkInfo.address).then(() => {
                // Показываем уведомление об успешном копировании
                if (tg && tg.showAlert) {
                    tg.showAlert('Адрес скопирован в буфер обмена');
                } else {
                    alert('Адрес скопирован в буфер обмена');
                }
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = networkInfo.address;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (tg && tg.showAlert) {
                    tg.showAlert('Адрес скопирован в буфер обмена');
                } else {
                    alert('Адрес скопирован в буфер обмена');
                }
            });
        }
    }
}

// Функция для поделиться адресом
function shareAddress() {
    if (selectedNetwork) {
        const networkInfo = getAddress(selectedNetwork);
        if (networkInfo) {
            const shareData = {
                title: `USDT ${networkInfo.standard} Адрес`,
                text: `Адрес для пополнения USDT через сеть ${networkInfo.name}`,
                url: networkInfo.address
            };
            
            if (navigator.share) {
                navigator.share(shareData).catch(err => {
                    console.error('Ошибка шаринга:', err);
                });
            } else {
                // Fallback для браузеров без поддержки Web Share API
                copyAddress();
            }
        }
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



// Функция для возврата на страницу выбора сети
function goBack() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.location.href = 'usdt-chain.html';
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
        backButton.onclick = () => window.location.href = 'usdt-chain.html';
        document.body.appendChild(backButton);
    }
}

// Показываем кнопку назад
goBack();
