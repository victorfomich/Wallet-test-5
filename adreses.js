// Список криптовалютных адресов для разных сетей
const cryptoAddresses = {
    // The Open Network (TON)
    ton: {
        name: "The Open Network",
        standard: "TON",
        address: "EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t",
        icon: "toncoin.png",
        color: "#0098e9"
    },
    
    // Tron (TRC20)
    tron: {
        name: "Tron",
        standard: "TRC20",
        address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        icon: "tron.png",
        color: "#FF0000"
    },
    
    // Solana (SPL)
    sol: {
        name: "Solana",
        standard: "SPL",
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        icon: "solana.png",
        color: "#000000"
    },
    
    // Ethereum (ERC20)
    eth: {
        name: "Ethereum",
        standard: "ERC20",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        icon: "ethereum.svg",
        color: "#627EEA"
    },
    
    // BNB Smart Chain (BEP20)
    bnb: {
        name: "BNB Smart Chain",
        standard: "BEP20",
        address: "0x55d398326f99059fF775485246999027B3197955",
        icon: "bnb.webp",
        color: "#F3BA2F"
    }
};

// Функция для получения адреса по сети
function getAddress(network) {
    if (cryptoAddresses[network]) {
        return cryptoAddresses[network];
    }
    return null;
}

// Функция для получения всех адресов
function getAllAddresses() {
    return cryptoAddresses;
}

// Функция для получения списка доступных сетей
function getAvailableNetworks() {
    return Object.keys(cryptoAddresses);
}

// Функция для проверки валидности адреса (базовая проверка)
function validateAddress(network, address) {
    const networkInfo = cryptoAddresses[network];
    if (!networkInfo) {
        return false;
    }
    
    // Простые проверки для разных сетей
    switch (network) {
        case 'ton':
            // TON адреса начинаются с EQ и имеют длину 48 символов
            return address.startsWith('EQ') && address.length === 48;
        case 'tron':
            // TRON адреса начинаются с T и имеют длину 34 символа
            return address.startsWith('T') && address.length === 34;
        case 'sol':
            // Solana адреса имеют длину 44 символа
            return address.length === 44;
        case 'eth':
            // Ethereum адреса начинаются с 0x и имеют длину 42 символа
            return address.startsWith('0x') && address.length === 42;
        case 'bnb':
            // BNB Smart Chain адреса как Ethereum
            return address.startsWith('0x') && address.length === 42;
        default:
            return false;
    }
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cryptoAddresses,
        getAddress,
        getAllAddresses,
        getAvailableNetworks,
        validateAddress
    };
} else {
    // Для использования в браузере
    window.cryptoAddresses = cryptoAddresses;
    window.getAddress = getAddress;
    window.getAllAddresses = getAllAddresses;
    window.getAvailableNetworks = getAvailableNetworks;
    window.validateAddress = validateAddress;
}