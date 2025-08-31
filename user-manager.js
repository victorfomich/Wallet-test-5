// Система управления пользователями для DreamWallet
const API_BASE_URL = window.location.origin;

class UserManager {
    constructor() {
        this.currentUser = null;
        this.userAddresses = null;
        this.isInitialized = false;
    }
    
    // Инициализация пользователя из Telegram
    async initializeUser(telegramUser) {
        if (!telegramUser) {
            console.error('Данные пользователя Telegram не предоставлены');
            return false;
        }
        
        try {
            console.log('Инициализация пользователя:', telegramUser);
            
            // Создаем или получаем пользователя
            const response = await fetch(`${API_BASE_URL}/api/addresses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegram_id: telegramUser.id,
                    first_name: telegramUser.first_name,
                    last_name: telegramUser.last_name || null,
                    username: telegramUser.username || null
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.userAddresses = data.addresses;
                this.isInitialized = true;
                
                console.log('Пользователь инициализирован:', this.currentUser);
                console.log('Адреса пользователя:', this.userAddresses);
                
                // Сохраняем в localStorage для быстрого доступа
                this.saveToLocalStorage();
                
                return true;
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
        } catch (error) {
            console.error('Ошибка инициализации пользователя:', error);
            return false;
        }
    }
    
    // Получить текущего пользователя
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Получить адреса пользователя
    getUserAddresses() {
        return this.userAddresses;
    }
    
    // Получить адрес для конкретной сети
    getAddressForNetwork(network) {
        if (!this.userAddresses) {
            return null;
        }
        
        return this.userAddresses[network] || null;
    }
    
    // Проверить, инициализирован ли пользователь
    isUserInitialized() {
        return this.isInitialized && this.currentUser && this.userAddresses;
    }
    
    // Обновить данные пользователя
    async refreshUserData() {
        if (!this.currentUser) {
            return false;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/addresses?telegram_id=${this.currentUser.telegram_id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.userAddresses = data.addresses;
                
                // Обновляем localStorage
                this.saveToLocalStorage();
                
                console.log('Данные пользователя обновлены');
                return true;
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
        } catch (error) {
            console.error('Ошибка обновления данных пользователя:', error);
            return false;
        }
    }
    
    // Сохранить в localStorage
    saveToLocalStorage() {
        try {
            const userData = {
                user: this.currentUser,
                addresses: this.userAddresses,
                timestamp: Date.now()
            };
            
            localStorage.setItem('dreamwallet_user', JSON.stringify(userData));
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
        }
    }
    
    // Загрузить из localStorage
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('dreamwallet_user');
            if (!stored) {
                return false;
            }
            
            const userData = JSON.parse(stored);
            
            // Проверяем, не устарели ли данные (старше 1 часа)
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - userData.timestamp > oneHour) {
                localStorage.removeItem('dreamwallet_user');
                return false;
            }
            
            this.currentUser = userData.user;
            this.userAddresses = userData.addresses;
            this.isInitialized = true;
            
            console.log('Данные пользователя загружены из localStorage');
            return true;
            
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            localStorage.removeItem('dreamwallet_user');
            return false;
        }
    }
    
    // Очистить данные пользователя
    clearUserData() {
        this.currentUser = null;
        this.userAddresses = null;
        this.isInitialized = false;
        
        try {
            localStorage.removeItem('dreamwallet_user');
        } catch (error) {
            console.error('Ошибка очистки localStorage:', error);
        }
        
        console.log('Данные пользователя очищены');
    }
    
    // Проверить доступность адресов для всех сетей
    hasAddressesForAllNetworks() {
        if (!this.userAddresses) {
            return false;
        }
        
        const networks = ['ton', 'tron', 'sol', 'eth', 'bnb'];
        return networks.every(network => this.userAddresses[network]);
    }
    
    // Получить статистику пользователя
    getUserStats() {
        if (!this.userAddresses) {
            return null;
        }
        
        const networks = ['ton', 'tron', 'sol', 'eth', 'bnb'];
        const availableNetworks = networks.filter(network => this.userAddresses[network]);
        
        return {
            totalNetworks: networks.length,
            availableNetworks: availableNetworks.length,
            missingNetworks: networks.filter(network => !this.userAddresses[network]),
            completionPercentage: Math.round((availableNetworks.length / networks.length) * 100)
        };
    }
    
    // Форматировать адрес для отображения
    formatAddress(address, maxLength = 16) {
        if (!address) {
            return 'Не назначен';
        }
        
        if (address.length <= maxLength) {
            return address;
        }
        
        const start = address.substring(0, Math.floor(maxLength / 2) - 2);
        const end = address.substring(address.length - Math.floor(maxLength / 2) + 2);
        
        return `${start}...${end}`;
    }
    
    // Валидация адреса
    validateAddress(network, address) {
        if (!address) {
            return false;
        }
        
        switch (network) {
            case 'ton':
                return address.startsWith('EQ') && address.length === 48;
            case 'tron':
                return address.startsWith('T') && address.length === 34;
            case 'sol':
                return address.length === 44;
            case 'eth':
            case 'bnb':
                return address.startsWith('0x') && address.length === 42;
            default:
                return false;
        }
    }
    
    // Получить информацию о сети
    getNetworkInfo(network) {
        const networkData = {
            ton: {
                name: "The Open Network",
                standard: "TON",
                icon: "toncoin.png",
                color: "#0098e9"
            },
            tron: {
                name: "Tron",
                standard: "TRC20",
                icon: "tron.png",
                color: "#FF0000"
            },
            sol: {
                name: "Solana",
                standard: "SPL",
                icon: "solana.png",
                color: "#000000"
            },
            eth: {
                name: "Ethereum",
                standard: "ERC20",
                icon: "ethereum.svg",
                color: "#627EEA"
            },
            bnb: {
                name: "BNB Smart Chain",
                standard: "BEP20",
                icon: "bnb.webp",
                color: "#F3BA2F"
            }
        };
        
        return networkData[network] || null;
    }
    
    // Получить полную информацию о сети с адресом пользователя
    getNetworkWithAddress(network) {
        const networkInfo = this.getNetworkInfo(network);
        if (!networkInfo) {
            return null;
        }
        
        const userAddress = this.getAddressForNetwork(network);
        
        return {
            ...networkInfo,
            address: userAddress,
            hasAddress: !!userAddress,
            isValid: this.validateAddress(network, userAddress)
        };
    }
    
    // Экспорт данных пользователя (для отладки/поддержки)
    exportUserData() {
        return {
            user: this.currentUser,
            addresses: this.userAddresses,
            stats: this.getUserStats(),
            timestamp: new Date().toISOString()
        };
    }
}

// Создаем глобальный экземпляр менеджера пользователей
window.userManager = new UserManager();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
