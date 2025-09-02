// Telegram Web App API
let tg = window.Telegram.WebApp;

// Глобальные переменные
let selectedNetwork = 'ton';
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
    
    // Автоматически загружаем TON адрес
    selectNetwork('ton');
    
    // Инициализируем ограничения приложения
    initAppRestrictions();
});

// Инициализация темы
function initTheme() {
    // Устанавливаем только темную тему
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Переключаем иконки для темной темы
    updateCopyIcons();
}

// Функция для обновления иконок копирования
function updateCopyIcons() {
    const copyLight = document.querySelector('.copy-light');
    const copyDark = document.querySelector('.copy-dark');
    
    if (copyLight && copyDark) {
        // Показываем только темную иконку
        copyLight.style.display = 'none';
        copyDark.style.display = 'block';
        // Сбрасываем opacity для плавного появления
        copyDark.style.opacity = '0.3';
    }
}



// Функция для выбора конкретной сети
async function selectNetwork(network) {
    selectedNetwork = network;
    
    // Сначала пытаемся загрузить пользователя из localStorage
    if (!window.userManager.isUserInitialized()) {
        const loaded = window.userManager.loadFromLocalStorage();
        if (!loaded) {
            console.warn('Пользователь не инициализирован, используем адреса по умолчанию');
        }
    }
    
    // Получаем информацию о сети и адрес пользователя
    let networkInfo = window.userManager.getNetworkWithAddress(network);
    
    // Если адрес пользователя не найден, используем адрес по умолчанию
    if (!networkInfo || !networkInfo.address) {
        console.warn(`Адрес пользователя для сети ${network} не найден, используем адрес по умолчанию`);
        const defaultNetworkInfo = getAddress(network);
        if (defaultNetworkInfo) {
            networkInfo = {
                ...defaultNetworkInfo,
                isUserAddress: false
            };
        }
    } else {
        networkInfo.isUserAddress = true;
    }
    
    if (networkInfo) {
        // Показываем QR карточку
        showQRCard(networkInfo);
        
        // Показываем информацию об адресе
        showAddressInfo(networkInfo);
        
        // Показываем кнопку пополнения
        showTopupButton();
        
        // Добавляем индикатор, если используется адрес по умолчанию
        if (!networkInfo.isUserAddress) {
            showDefaultAddressWarning();
        }
    } else {
        showNetworkError(network);
    }
}

// Функция для показа QR карточки
function showQRCard(networkInfo) {
    const qrContainer = document.getElementById('qrContainer');
    
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
        image: networkInfo.icon || "toncoin.png",
        dotsOptions: {
            color: networkInfo.color || "#0088cc",
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
            color: networkInfo.color || "#0088cc",
            type: "extra-rounded"
        },
        cornersDotOptions: {
            color: networkInfo.color || "#0088cc",
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
                <div style="font-size: 10px; margin-top: 4px;">TON</div>
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
    
    // Обновляем адрес в кнопке пополнения (если есть)
    if (addressDisplay) {
        addressDisplay.textContent = networkInfo.address;
    }
}

// Функция для показа кнопки пополнения
function showTopupButton() {
    // Кнопка уже видна по умолчанию
}

// Показать предупреждение о использовании адреса по умолчанию
function showDefaultAddressWarning() {
    const container = document.querySelector('.container');
    const warning = document.createElement('div');
    warning.style.cssText = `
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
        color: #856404;
        font-size: 14px;
        text-align: center;
    `;
    warning.innerHTML = '⚠️ Используется временный адрес. Для получения персонального адреса перезайдите в приложение.';
    
    // Вставляем после QR карточки
    const qrCard = document.getElementById('qrCard');
    if (qrCard && qrCard.nextSibling) {
        container.insertBefore(warning, qrCard.nextSibling);
    } else {
        container.appendChild(warning);
    }
}

// Показать ошибку сети
function showNetworkError(network) {
    const container = document.querySelector('.container');
    const error = document.createElement('div');
    error.style.cssText = `
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.3);
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        color: #721c24;
        text-align: center;
    `;
    error.innerHTML = `❌ Ошибка загрузки адреса для сети ${network}. Попробуйте перезагрузить страницу.`;
    container.appendChild(error);
}

// Функция для копирования адреса
function copyAddress() {
    if (selectedNetwork) {
        // Сначала пытаемся получить адрес пользователя
        let networkInfo = window.userManager.getNetworkWithAddress(selectedNetwork);
        
        // Если адрес пользователя не найден, используем адрес по умолчанию
        if (!networkInfo || !networkInfo.address) {
            networkInfo = getAddress(selectedNetwork);
        }
        
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
                title: `TON Адрес`,
                text: `Адрес для пополнения TON`,
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



// Функция для возврата на страницу TON
function goBack() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.location.href = 'ton.html';
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
            background-color: #0088cc;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 1000;
        `;
        backButton.onclick = () => window.location.href = 'ton.html';
        document.body.appendChild(backButton);
    }
}

// Показываем кнопку назад
goBack();