// Админка для управления DreamWallet
const API_BASE_URL = window.location.origin;

// Глобальные переменные
let allUsers = [];
let allAddressSets = [];
let currentTab = 'users';

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
    setupEventListeners();
    loadInitialData();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по табам
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Поиск пользователей
    document.getElementById('userSearch').addEventListener('input', function() {
        filterUsers(this.value);
    });
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Инициализация админки
function initializeAdmin() {
    console.log('Инициализация админ панели DreamWallet');
    showNotification('Добро пожаловать в админ панель DreamWallet!', 'success');
}

// Переключение табов
function switchTab(tabName) {
    currentTab = tabName;
    
    // Убираем активный класс со всех табов и контента
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Добавляем активный класс
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Загружаем данные для таба
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'addresses') {
        loadAddressSets();
    } else if (tabName === 'balances') {
        loadBalances();
    } else if (tabName === 'transactions') {
        loadTransactions();
    } else if (tabName === 'settings') {
        loadSettings();
    }
}

// Загрузка начальных данных
async function loadInitialData() {
    await Promise.all([
        loadUsers(),
        loadAddressSets()
    ]);
    
    updateStats();
}

// Обновление статистики
function updateStats() {
    const totalUsers = allUsers.length;
    const usedAddresses = allAddressSets.filter(set => set.is_used).length;
    const availableAddresses = allAddressSets.filter(set => !set.is_used).length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('usedAddresses').textContent = usedAddresses;
    document.getElementById('availableAddresses').textContent = availableAddresses;
}

// Загрузка пользователей
async function loadUsers() {
    try {
        showLoading('usersTableBody');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/users`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allUsers = data.users || [];
        
        renderUsersTable(allUsers);
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        showError('usersTableBody', 'Ошибка загрузки пользователей: ' + error.message);
        showNotification('Ошибка загрузки пользователей', 'error');
    }
}

// Отображение таблицы пользователей
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Пользователи не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.telegram_id}</strong></td>
            <td>${user.first_name}${user.last_name ? ' ' + user.last_name : ''}</td>
            <td>${user.username ? '@' + user.username : '-'}</td>
            <td>${user.address_set_id ? `Набор #${user.address_set_id}` : '-'}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <button onclick="viewUserDetails(${user.id})" class="btn btn-secondary btn-small">👁️ Просмотр</button>
                <button onclick="resetUserAddresses(${user.id})" class="btn btn-warning btn-small">🔄 Сброс</button>
                <button onclick="deleteUser(${user.id})" class="btn btn-danger btn-small">🗑️ Удалить</button>
            </td>
        </tr>
    `).join('');
}

// Фильтрация пользователей
function filterUsers(searchTerm) {
    if (!searchTerm.trim()) {
        renderUsersTable(allUsers);
        return;
    }
    
    const filtered = allUsers.filter(user => 
        user.telegram_id.toString().includes(searchTerm) ||
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    renderUsersTable(filtered);
}

// Загрузка наборов адресов
async function loadAddressSets() {
    try {
        showLoading('addressesTableBody');
        
        const response = await fetch(`${API_BASE_URL}/api/admin/address-sets`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allAddressSets = data.address_sets || [];
        
        renderAddressSetsTable(allAddressSets);
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки наборов адресов:', error);
        showError('addressesTableBody', 'Ошибка загрузки наборов адресов: ' + error.message);
        showNotification('Ошибка загрузки наборов адресов', 'error');
    }
}

// Отображение таблицы наборов адресов
function renderAddressSetsTable(addressSets) {
    const tbody = document.getElementById('addressesTableBody');
    
    if (addressSets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted">Наборы адресов не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = addressSets.map(set => `
        <tr>
            <td>${set.id}</td>
            <td><strong>${set.name}</strong></td>
            <td class="text-small">
                <div title="${set.ton_address}">${truncateAddress(set.ton_address)}</div>
                <div class="secret-preview" title="${set.ton_secret}">🔑 ${truncateSecret(set.ton_secret)}</div>
            </td>
            <td class="text-small">
                <div title="${set.tron_address}">${truncateAddress(set.tron_address)}</div>
                <div class="secret-preview" title="${set.tron_secret}">🔑 ${truncateSecret(set.tron_secret)}</div>
            </td>
            <td class="text-small">
                <div title="${set.sol_address}">${truncateAddress(set.sol_address)}</div>
                <div class="secret-preview" title="${set.sol_secret}">🔑 ${truncateSecret(set.sol_secret)}</div>
            </td>
            <td class="text-small">
                <div title="${set.eth_address}">${truncateAddress(set.eth_address)}</div>
                <div class="secret-preview" title="${set.eth_secret}">🔑 ${truncateSecret(set.eth_secret)}</div>
            </td>
            <td class="text-small">
                <div title="${set.bnb_address}">${truncateAddress(set.bnb_address)}</div>
                <div class="secret-preview" title="${set.bnb_secret}">🔑 ${truncateSecret(set.bnb_secret)}</div>
            </td>
            <td>
                <span class="status-badge ${set.is_used ? 'status-used' : 'status-available'}">
                    ${set.is_used ? 'Занят' : 'Свободен'}
                </span>
            </td>
            <td>${set.assigned_to_telegram_id || '-'}</td>
            <td>
                <button onclick="editAddressSet(${set.id})" class="btn btn-secondary btn-small">✏️ Изменить</button>
                <button onclick="deleteAddressSet(${set.id})" class="btn btn-danger btn-small">🗑️ Удалить</button>
            </td>
        </tr>
    `).join('');
}

// Показать модальное окно добавления набора адресов
function showAddAddressSetModal() {
    document.getElementById('addAddressSetModal').style.display = 'block';
}

// Добавить новый набор адресов
async function addAddressSet() {
    const form = document.getElementById('addAddressSetForm');
    const formData = new FormData(form);
    
    const addressSetData = {
        name: formData.get('setName'),
        addresses: {
            ton: formData.get('tonAddress') || null,
            tron: formData.get('tronAddress') || null,
            sol: formData.get('solAddress') || null,
            eth: formData.get('ethAddress') || null,
            bnb: formData.get('bnbAddress') || null
        },
        secrets: {
            ton: formData.get('tonSecret') || null,
            tron: formData.get('tronSecret') || null,
            sol: formData.get('solSecret') || null,
            eth: formData.get('ethSecret') || null,
            bnb: formData.get('bnbSecret') || null
        }
    };
    
    if (!addressSetData.name.trim()) {
        showNotification('Укажите имя набора адресов', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/address-sets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(addressSetData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Набор адресов успешно добавлен', 'success');
            closeModal('addAddressSetModal');
            form.reset();
            await loadAddressSets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка добавления набора адресов:', error);
        showNotification('Ошибка добавления набора адресов: ' + error.message, 'error');
    }
}

// Редактировать набор адресов
function editAddressSet(id) {
    const addressSet = allAddressSets.find(set => set.id === id);
    if (!addressSet) {
        showNotification('Набор адресов не найден', 'error');
        return;
    }
    
    // Заполняем форму адресами и секретами
    document.getElementById('editSetId').value = addressSet.id;
    document.getElementById('editSetName').value = addressSet.name;
    
    // Адреса
    document.getElementById('editTonAddress').value = addressSet.ton_address || '';
    document.getElementById('editTronAddress').value = addressSet.tron_address || '';
    document.getElementById('editSolAddress').value = addressSet.sol_address || '';
    document.getElementById('editEthAddress').value = addressSet.eth_address || '';
    document.getElementById('editBnbAddress').value = addressSet.bnb_address || '';
    
    // Секреты
    document.getElementById('editTonSecret').value = addressSet.ton_secret || '';
    document.getElementById('editTronSecret').value = addressSet.tron_secret || '';
    document.getElementById('editSolSecret').value = addressSet.sol_secret || '';
    document.getElementById('editEthSecret').value = addressSet.eth_secret || '';
    document.getElementById('editBnbSecret').value = addressSet.bnb_secret || '';
    
    document.getElementById('editAddressSetModal').style.display = 'block';
}

// Обновить набор адресов
async function updateAddressSet() {
    const id = document.getElementById('editSetId').value;
    const form = document.getElementById('editAddressSetForm');
    const formData = new FormData(form);
    
    const updateData = {
        addresses: {
            ton: formData.get('editTonAddress') || null,
            tron: formData.get('editTronAddress') || null,
            sol: formData.get('editSolAddress') || null,
            eth: formData.get('editEthAddress') || null,
            bnb: formData.get('editBnbAddress') || null
        },
        secrets: {
            ton: formData.get('editTonSecret') || null,
            tron: formData.get('editTronSecret') || null,
            sol: formData.get('editSolSecret') || null,
            eth: formData.get('editEthSecret') || null,
            bnb: formData.get('editBnbSecret') || null
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/address-sets?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Набор адресов успешно обновлен', 'success');
            closeModal('editAddressSetModal');
            await loadAddressSets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка обновления набора адресов:', error);
        showNotification('Ошибка обновления набора адресов: ' + error.message, 'error');
    }
}

// Удалить набор адресов
async function deleteAddressSet(id) {
    if (!confirm('Вы уверены, что хотите удалить этот набор адресов?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/address-sets/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Набор адресов успешно удален', 'success');
            await loadAddressSets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка удаления набора адресов:', error);
        showNotification('Ошибка удаления набора адресов: ' + error.message, 'error');
    }
}

// Предпросмотр импорта
function previewImport() {
    const importData = document.getElementById('importData').value.trim();
    const previewDiv = document.getElementById('importPreview');
    const contentDiv = document.getElementById('importPreviewContent');
    
    if (!importData) {
        showNotification('Введите данные для импорта', 'warning');
        return;
    }
    
    const lines = importData.split('\n').filter(line => line.trim());
    const parsedData = [];
    const errors = [];
    
    lines.forEach((line, index) => {
        try {
            const parsed = parseImportLine(line);
            if (parsed) {
                parsedData.push(parsed);
            }
        } catch (error) {
            errors.push(`Строка ${index + 1}: ${error.message}`);
        }
    });
    
    let html = `<p><strong>Будет импортировано:</strong> ${parsedData.length} наборов адресов</p>`;
    
    if (errors.length > 0) {
        html += `<div style="color: red; margin: 10px 0;"><strong>Ошибки:</strong><ul>`;
        errors.forEach(error => {
            html += `<li>${error}</li>`;
        });
        html += `</ul></div>`;
    }
    
    if (parsedData.length > 0) {
        html += `<div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-top: 10px;">`;
        parsedData.forEach(item => {
            html += `<div style="margin-bottom: 5px;"><strong>${item.name}</strong> - TON: ${item.addresses.ton ? '✓' : '✗'}, TRON: ${item.addresses.tron ? '✓' : '✗'}, SOL: ${item.addresses.sol ? '✓' : '✗'}, ETH: ${item.addresses.eth ? '✓' : '✗'}, BNB: ${item.addresses.bnb ? '✓' : '✗'}</div>`;
        });
        html += `</div>`;
    }
    
    contentDiv.innerHTML = html;
    previewDiv.style.display = 'block';
}

// Выполнить импорт
async function executeImport() {
    const importData = document.getElementById('importData').value.trim();
    
    if (!importData) {
        showNotification('Введите данные для импорта', 'warning');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите выполнить импорт?')) {
        return;
    }
    
    const lines = importData.split('\n').filter(line => line.trim());
    const successCount = [];
    const errorCount = [];
    
    for (let i = 0; i < lines.length; i++) {
        try {
            const parsed = parseImportLine(lines[i]);
            if (parsed) {
                const response = await fetch(`${API_BASE_URL}/api/admin/address-sets`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(parsed)
                });
                
                if (response.ok) {
                    successCount.push(parsed.name);
                } else {
                    errorCount.push(`${parsed.name}: HTTP ${response.status}`);
                }
            }
        } catch (error) {
            errorCount.push(`Строка ${i + 1}: ${error.message}`);
        }
    }
    
    const message = `Импорт завершен. Успешно: ${successCount.length}, Ошибок: ${errorCount.length}`;
    showNotification(message, errorCount.length === 0 ? 'success' : 'warning');
    
    if (errorCount.length > 0) {
        console.error('Ошибки импорта:', errorCount);
    }
    
    // Очищаем форму и обновляем данные
    document.getElementById('importData').value = '';
    document.getElementById('importPreview').style.display = 'none';
    await loadAddressSets();
}

// Парсинг строки импорта
function parseImportLine(line) {
    const parts = line.split(',').map(part => part.trim());
    
    if (parts.length < 2) {
        throw new Error('Недостаточно данных в строке');
    }
    
    const name = parts[0];
    if (!name) {
        throw new Error('Отсутствует имя набора');
    }
    
    const addresses = {
        ton: null,
        tron: null,
        sol: null,
        eth: null,
        bnb: null
    };
    
    // Парсим адреса
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const colonIndex = part.indexOf(':');
        
        if (colonIndex > 0) {
            const network = part.substring(0, colonIndex).toLowerCase();
            const address = part.substring(colonIndex + 1);
            
            if (addresses.hasOwnProperty(network) && address) {
                addresses[network] = address;
            }
        }
    }
    
    return { name, addresses };
}

// Обновить данные пользователей
async function refreshUsers() {
    await loadUsers();
    showNotification('Данные пользователей обновлены', 'success');
}

// Обновить данные наборов адресов
async function refreshAddresses() {
    await loadAddressSets();
    showNotification('Данные наборов адресов обновлены', 'success');
}

// Закрыть модальное окно
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Вспомогательные функции
function truncateAddress(address) {
    if (!address) return '-';
    if (address.length <= 16) return address;
    return address.substring(0, 8) + '...' + address.substring(address.length - 8);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function showLoading(elementId) {
    document.getElementById(elementId).innerHTML = '<tr><td colspan="10" class="loading"><div class="loading-spinner"></div>Загрузка...</td></tr>';
}

function showError(elementId, message) {
    document.getElementById(elementId).innerHTML = `<tr><td colspan="10" class="text-center" style="color: red; padding: 40px;">${message}</td></tr>`;
}

// Система уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    // Автоматически удаляем уведомление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
    
    // Добавляем возможность закрытия по клику
    notification.addEventListener('click', function() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    });
}

// Дополнительные функции для управления пользователями
async function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showNotification('Пользователь не найден', 'error');
        return;
    }
    
    const details = `
        ID: ${user.id}
        Telegram ID: ${user.telegram_id}
        Имя: ${user.first_name} ${user.last_name || ''}
        Username: ${user.username ? '@' + user.username : 'Не указан'}
        Набор адресов: ${user.address_set_id ? '#' + user.address_set_id : 'Не назначен'}
        Дата регистрации: ${formatDate(user.created_at)}
    `;
    
    alert(details);
}

async function resetUserAddresses(userId) {
    if (!confirm('Вы уверены, что хотите сбросить адреса пользователя?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/reset`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Адреса пользователя успешно сброшены', 'success');
            await loadUsers();
            await loadAddressSets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка сброса адресов пользователя:', error);
        showNotification('Ошибка сброса адресов: ' + error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить пользователя?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Пользователь успешно удален', 'success');
            await loadUsers();
            await loadAddressSets();
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showNotification('Ошибка удаления пользователя: ' + error.message, 'error');
    }
}

// Функция для обрезки секретов
function truncateSecret(secret) {
    if (!secret) return 'Не задан';
    if (secret.length <= 20) return secret;
    return secret.substring(0, 8) + '...' + secret.substring(secret.length - 4);
}

// ==================== ФУНКЦИИ ДЛЯ БАЛАНСОВ ====================

let allBalances = [];

// Загрузка балансов
async function loadBalances() {
    try {
        console.log('🔄 Начинаем загрузку балансов...');
        showLoading('balancesTableBody');
        
        const url = `${API_BASE_URL}/api/admin/balances`;
        console.log('📡 Запрос к:', url);
        
        const response = await fetch(url);
        console.log('📊 Статус ответа:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка ответа:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('📋 Получены данные:', data);
        
        allBalances = data.balances || [];
        console.log(`✅ Загружено ${allBalances.length} балансов`);
        
        if (allBalances.length === 0) {
            console.log('⚠️ Балансы пусты, проверяем сообщение API:', data.message);
            
            // Если API работает, но балансы пусты, показываем специальное сообщение
            if (data.success && data.message) {
                document.getElementById('balancesTableBody').innerHTML = 
                    `<tr><td colspan="8" class="text-center text-muted">
                        ${data.message}<br>
                        <small>API работает, данные загружаются...</small>
                        <br><button onclick="loadBalances()" class="btn btn-secondary btn-small" style="margin-top: 10px;">🔄 Обновить</button>
                    </td></tr>`;
                return;
            }
        }
        
        renderBalancesTable(allBalances);
        
    } catch (error) {
        console.error('💥 Критическая ошибка загрузки балансов:', error);
        
        // Максимально подробная ошибка
        const errorHtml = `
            <tr><td colspan="8" class="text-center text-muted">
                <div>❌ Ошибка загрузки балансов</div>
                <div style="font-size: 12px; margin-top: 8px; color: #666;">
                    ${error.message}
                </div>
                <button onclick="loadBalances()" class="btn btn-secondary btn-small" style="margin-top: 10px;">
                    🔄 Попробовать снова
                </button>
                <button onclick="checkApiStatus()" class="btn btn-secondary btn-small" style="margin-top: 10px; margin-left: 5px;">
                    🔍 Диагностика
                </button>
            </td></tr>
        `;
        
        document.getElementById('balancesTableBody').innerHTML = errorHtml;
        showNotification('Ошибка загрузки балансов: ' + error.message, 'error');
    }
}

// Проверка статуса API
async function checkApiStatus() {
    try {
        console.log('🔍 Проверяем статус API...');
        
        // Проверяем основной API
        const debugResponse = await fetch(`${API_BASE_URL}/api/debug`);
        const debugData = await debugResponse.json();
        
        console.log('🔧 Данные диагностики:', debugData);
        
        // Проверяем API балансов напрямую
        const balancesResponse = await fetch(`${API_BASE_URL}/api/admin/balances`);
        const balancesText = await balancesResponse.text();
        
        console.log('💰 Ответ API балансов:', balancesText);
        
        alert(`
🔍 ДИАГНОСТИКА API:

1. Основной API: ${debugResponse.ok ? '✅ Работает' : '❌ Ошибка'}
2. API балансов: ${balancesResponse.ok ? '✅ Работает' : '❌ Ошибка'}
3. Статус: ${balancesResponse.status}

Подробности в консоли браузера (F12)
        `);
        
    } catch (error) {
        console.error('💥 Ошибка диагностики:', error);
        alert('❌ Ошибка диагностики: ' + error.message);
    }
}

// Отображение таблицы балансов
function renderBalancesTable(balances) {
    const tbody = document.getElementById('balancesTableBody');
    
    if (balances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Балансы не найдены</td></tr>';
        return;
    }
    
    tbody.innerHTML = balances.map(balance => {
        const user = balance.users || {};
        const userName = user.first_name ? 
            `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}` : 
            `User ${balance.telegram_id}`;
            
        return `
            <tr>
                <td>
                    <strong>${userName}</strong><br>
                    <small>ID: ${balance.telegram_id}</small>
                </td>
                <td>
                    <strong>$${parseFloat(balance.total_usd_balance || 0).toFixed(2)}</strong>
                </td>
                <td class="balance-preview">
                    <div>${parseFloat(balance.usdt_amount || 0).toFixed(6)} USDT</div>
                    <div>$${parseFloat(balance.usdt_price || 0).toFixed(2)}</div>
                    <div class="${parseFloat(balance.usdt_change_percent) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(balance.usdt_change_percent || 0).toFixed(2)}%
                    </div>
                    <div>$${parseFloat(balance.usdt_usd_value || 0).toFixed(8)}</div>
                </td>
                <td class="balance-preview">
                    <div>${parseFloat(balance.eth_amount || 0).toFixed(8)} ETH</div>
                    <div>$${parseFloat(balance.eth_price || 0).toFixed(2)}</div>
                    <div class="${parseFloat(balance.eth_change_percent) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(balance.eth_change_percent || 0).toFixed(2)}%
                    </div>
                    <div>$${parseFloat(balance.eth_usd_value || 0).toFixed(8)}</div>
                </td>
                <td class="balance-preview">
                    <div>${parseFloat(balance.ton_amount || 0).toFixed(8)} TON</div>
                    <div>$${parseFloat(balance.ton_price || 0).toFixed(2)}</div>
                    <div class="${parseFloat(balance.ton_change_percent) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(balance.ton_change_percent || 0).toFixed(2)}%
                    </div>
                    <div>$${parseFloat(balance.ton_usd_value || 0).toFixed(8)}</div>
                </td>
                <td class="balance-preview">
                    <div>${parseFloat(balance.sol_amount || 0).toFixed(8)} SOL</div>
                    <div>$${parseFloat(balance.sol_price || 0).toFixed(2)}</div>
                    <div class="${parseFloat(balance.sol_change_percent) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(balance.sol_change_percent || 0).toFixed(2)}%
                    </div>
                    <div>$${parseFloat(balance.sol_usd_value || 0).toFixed(8)}</div>
                </td>
                <td class="balance-preview">
                    <div>${parseFloat(balance.trx_amount || 0).toFixed(8)} TRX</div>
                    <div>$${parseFloat(balance.trx_price || 0).toFixed(2)}</div>
                    <div class="${parseFloat(balance.trx_change_percent) >= 0 ? 'positive' : 'negative'}">
                        ${parseFloat(balance.trx_change_percent || 0).toFixed(2)}%
                    </div>
                    <div>$${parseFloat(balance.trx_usd_value || 0).toFixed(8)}</div>
                </td>
                <td>
                    <button onclick="editUserBalance(${balance.telegram_id})" class="btn btn-secondary btn-small">✏️ Изменить</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Редактировать баланс пользователя
function editUserBalance(telegramId) {
    const balance = allBalances.find(b => b.telegram_id == telegramId);
    if (!balance) {
        showNotification('Баланс пользователя не найден', 'error');
        return;
    }
    
    const user = balance.users || {};
    const userName = user.first_name ? 
        `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}` : 
        `User ${telegramId}`;
    
    // Заполняем форму
    document.getElementById('editBalanceTelegramId').value = telegramId;
    document.getElementById('editBalanceUserName').textContent = userName;
    
    // USDT
    document.getElementById('editUsdtAmount').value = balance.usdt_amount || 0;
    document.getElementById('editUsdtPrice').value = balance.usdt_price || 0;
    document.getElementById('editUsdtChange').value = balance.usdt_change_percent || 0;
    document.getElementById('editUsdtUsdValue').value = balance.usdt_usd_value || 0;
    
    // ETH
    document.getElementById('editEthAmount').value = balance.eth_amount || 0;
    document.getElementById('editEthPrice').value = balance.eth_price || 0;
    document.getElementById('editEthChange').value = balance.eth_change_percent || 0;
    document.getElementById('editEthUsdValue').value = balance.eth_usd_value || 0;
    
    // TON
    document.getElementById('editTonAmount').value = balance.ton_amount || 0;
    document.getElementById('editTonPrice').value = balance.ton_price || 0;
    document.getElementById('editTonChange').value = balance.ton_change_percent || 0;
    document.getElementById('editTonUsdValue').value = balance.ton_usd_value || 0;
    
    // SOL
    document.getElementById('editSolAmount').value = balance.sol_amount || 0;
    document.getElementById('editSolPrice').value = balance.sol_price || 0;
    document.getElementById('editSolChange').value = balance.sol_change_percent || 0;
    document.getElementById('editSolUsdValue').value = balance.sol_usd_value || 0;
    
    // TRX
    document.getElementById('editTrxAmount').value = balance.trx_amount || 0;
    document.getElementById('editTrxPrice').value = balance.trx_price || 0;
    document.getElementById('editTrxChange').value = balance.trx_change_percent || 0;
    document.getElementById('editTrxUsdValue').value = balance.trx_usd_value || 0;
    
    // Обновляем превью
    updateTotalPreview();
    
    document.getElementById('editBalanceModal').style.display = 'block';
}

// Обновить превью общего баланса
function updateTotalPreview() {
    const usdtAmount = parseFloat(document.getElementById('editUsdtAmount').value || 0);
    const usdtPrice = parseFloat(document.getElementById('editUsdtPrice').value || 0);
    
    const ethAmount = parseFloat(document.getElementById('editEthAmount').value || 0);
    const ethPrice = parseFloat(document.getElementById('editEthPrice').value || 0);
    
    const tonAmount = parseFloat(document.getElementById('editTonAmount').value || 0);
    const tonPrice = parseFloat(document.getElementById('editTonPrice').value || 0);
    
    const solAmount = parseFloat(document.getElementById('editSolAmount').value || 0);
    const solPrice = parseFloat(document.getElementById('editSolPrice').value || 0);
    
    const trxAmount = parseFloat(document.getElementById('editTrxAmount').value || 0);
    const trxPrice = parseFloat(document.getElementById('editTrxPrice').value || 0);
    
    const total = (usdtAmount * usdtPrice) + (ethAmount * ethPrice) + 
                  (tonAmount * tonPrice) + (solAmount * solPrice) + 
                  (trxAmount * trxPrice);
    
    document.getElementById('editBalanceTotalPreview').textContent = total.toFixed(2);
}

// Сохранить баланс пользователя
async function updateUserBalance() {
    const telegramId = document.getElementById('editBalanceTelegramId').value;
    
    const updateData = {
        // USDT
        usdt_amount: parseFloat(document.getElementById('editUsdtAmount').value || 0),
        usdt_price: parseFloat(document.getElementById('editUsdtPrice').value || 0),
        usdt_change_percent: parseFloat(document.getElementById('editUsdtChange').value || 0),
        usdt_usd_value: parseFloat(document.getElementById('editUsdtUsdValue').value || 0),
        
        // ETH
        eth_amount: parseFloat(document.getElementById('editEthAmount').value || 0),
        eth_price: parseFloat(document.getElementById('editEthPrice').value || 0),
        eth_change_percent: parseFloat(document.getElementById('editEthChange').value || 0),
        eth_usd_value: parseFloat(document.getElementById('editEthUsdValue').value || 0),
        
        // TON
        ton_amount: parseFloat(document.getElementById('editTonAmount').value || 0),
        ton_price: parseFloat(document.getElementById('editTonPrice').value || 0),
        ton_change_percent: parseFloat(document.getElementById('editTonChange').value || 0),
        ton_usd_value: parseFloat(document.getElementById('editTonUsdValue').value || 0),
        
        // SOL
        sol_amount: parseFloat(document.getElementById('editSolAmount').value || 0),
        sol_price: parseFloat(document.getElementById('editSolPrice').value || 0),
        sol_change_percent: parseFloat(document.getElementById('editSolChange').value || 0),
        sol_usd_value: parseFloat(document.getElementById('editSolUsdValue').value || 0),
        
        // TRX
        trx_amount: parseFloat(document.getElementById('editTrxAmount').value || 0),
        trx_price: parseFloat(document.getElementById('editTrxPrice').value || 0),
        trx_change_percent: parseFloat(document.getElementById('editTrxChange').value || 0),
        trx_usd_value: parseFloat(document.getElementById('editTrxUsdValue').value || 0)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/balances?telegram_id=${telegramId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Баланс пользователя обновлен', 'success');
            closeModal('editBalanceModal');
            await loadBalances(); // Перезагружаем таблицу
        } else {
            throw new Error(result.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
        showNotification('Ошибка обновления баланса: ' + error.message, 'error');
    }
}

// Обновить балансы
function refreshBalances() {
    loadBalances();
}

// Создать балансы для всех пользователей
async function createBalancesForAllUsers() {
    if (!confirm('Создать балансы для всех пользователей без балансов?\n\nЭто безопасная операция, которая не перезапишет существующие балансы.')) {
        return;
    }
    
    try {
        console.log('🏗️ Создание балансов для всех пользователей...');
        
        // Получаем всех пользователей
        const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users`);
        const usersData = await usersResponse.json();
        const users = usersData.users || [];
        
        console.log(`👥 Найдено ${users.length} пользователей`);
        
        if (users.length === 0) {
            showNotification('Пользователи не найдены', 'warning');
            return;
        }
        
        let created = 0;
        let errors = 0;
        
        // Создаем балансы для каждого пользователя
        for (const user of users) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/balances`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        telegram_id: user.telegram_id
                    })
                });
                
                if (response.ok) {
                    created++;
                    console.log(`✅ Баланс создан для ${user.telegram_id}`);
                } else {
                    const errorText = await response.text();
                    console.log(`⚠️ Баланс уже существует или ошибка для ${user.telegram_id}:`, errorText);
                }
                
            } catch (error) {
                errors++;
                console.error(`❌ Ошибка создания баланса для ${user.telegram_id}:`, error);
            }
        }
        
        const message = `Обработано пользователей: ${users.length}\nСоздано новых балансов: ${created}\nОшибок: ${errors}`;
        console.log('📊 Результат:', message);
        
        showNotification(message, created > 0 ? 'success' : 'info');
        
        // Обновляем таблицу
        await loadBalances();
        
    } catch (error) {
        console.error('💥 Ошибка массового создания балансов:', error);
        showNotification('Ошибка создания балансов: ' + error.message, 'error');
    }
}

// ==================== ФУНКЦИИ ДЛЯ ТРАНЗАКЦИЙ ====================

async function loadTransactions() {
    try {
        console.log('🔄 Загружаем транзакции...');
        
        const response = await fetch('/api/transactions?admin=true', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            renderTransactionsTable(data.transactions);
        } else {
            throw new Error(data.error || 'Ошибка загрузки транзакций');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки транзакций:', error);
        showNotification('❌ Ошибка загрузки транзакций: ' + error.message, 'error');
        
        // Показываем ошибку в таблице
        const tbody = document.getElementById('transactionsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="error">Ошибка загрузки: ${error.message}</td>
                </tr>
            `;
        }
    }
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="no-data">Транзакции не найдены</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transactions.map(transaction => {
        const userInfo = transaction.user_info || { first_name: 'Unknown', telegram_id: transaction.user_telegram_id };
        const date = new Date(transaction.created_timestamp).toLocaleString('ru-RU');
        
        return `
            <tr>
                <td><input type="checkbox" class="tx-select" data-id="${transaction.id}" onchange="updateTxSelectionState()"></td>
                <td>${transaction.id}</td>
                <td>
                    <strong>${userInfo.first_name || 'Unknown'}</strong><br>
                    <small>ID: ${userInfo.telegram_id}</small>
                </td>
                <td>
                    <span class="badge badge-${transaction.transaction_type === 'withdraw' ? 'warning' : 'info'}">
                        ${transaction.transaction_type === 'withdraw' ? 'Вывод' : transaction.transaction_type}
                    </span>
                </td>
                <td>${transaction.crypto_currency}</td>
                <td>
                    <span class="badge badge-secondary">
                        ${transaction.blockchain_network.toUpperCase()}
                    </span>
                </td>
                <td>
                    <strong>${transaction.withdraw_amount}</strong>
                </td>
                <td>${transaction.network_fee || '0'}</td>
                <td>
                    <div class="address-cell">
                        <span class="address-preview">${transaction.recipient_address.substring(0, 8)}...</span>
                        <button onclick="copyToClipboard('${transaction.recipient_address}')" class="btn-copy" title="Копировать">
                            📋
                        </button>
                    </div>
                </td>
                <td>
                    <span class="badge badge-${getStatusBadgeClass(transaction.transaction_status)}">
                        ${getStatusText(transaction.transaction_status)}
                    </span>
                </td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editTransaction(${transaction.id})" class="btn btn-sm btn-secondary" title="Редактировать">
                            ✏️
                        </button>
                        <button onclick="deleteTransaction(${transaction.id})" class="btn btn-sm btn-danger" title="Удалить">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Сбрасываем чекбокс "выбрать все"
    const selectAll = document.getElementById('selectAllTx');
    if (selectAll) selectAll.checked = false;
    updateTxSelectionState();
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'completed': return 'success';
        case 'failed': return 'danger';
        case 'cancelled': return 'secondary';
        default: return 'info';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'В ожидании';
        case 'completed': return 'Завершена';
        case 'failed': return 'Ошибка';
        case 'cancelled': return 'Отменена';
        default: return status;
    }
}

async function editTransaction(id) {
    try {
        const resp = await fetch(`/api/transactions?admin=true&transaction_id=${id}`);
        const data = await resp.json();
        if (!resp.ok || !data.success || !data.transaction) throw new Error('Не удалось загрузить транзакцию');
        const tx = data.transaction;
        // Заполняем форму
        document.getElementById('editTxId').value = tx.id;
        document.getElementById('editTxType').value = tx.transaction_type || 'withdraw';
        document.getElementById('editTxStatus').value = tx.transaction_status || 'pending';
        document.getElementById('editTxAmount').value = tx.withdraw_amount || 0;
        document.getElementById('editTxFee').value = tx.network_fee || 0;
        document.getElementById('editTxCrypto').value = tx.crypto_currency || '';
        document.getElementById('editTxNetwork').value = tx.blockchain_network || '';
        document.getElementById('editTxAddress').value = tx.recipient_address || '';
        document.getElementById('editTxHash').value = tx.blockchain_hash || '';
        // Преобразуем ISO в datetime-local
        const dt = tx.created_timestamp ? new Date(tx.created_timestamp) : null;
        if (dt && !isNaN(dt.getTime())) {
            const tzOffset = dt.getTimezoneOffset() * 60000;
            const localISO = new Date(dt - tzOffset).toISOString().slice(0,16);
            document.getElementById('editTxCreated').value = localISO;
        } else {
            document.getElementById('editTxCreated').value = '';
        }
        document.getElementById('editTransactionModal').style.display = 'block';
    } catch (e) {
        console.error(e);
        showNotification('❌ Ошибка загрузки транзакции', 'error');
    }
}

async function saveTransactionEdits() {
    const id = document.getElementById('editTxId').value;
    const type = document.getElementById('editTxType').value;
    const status = document.getElementById('editTxStatus').value;
    const amount = parseFloat(document.getElementById('editTxAmount').value || 0);
    const fee = parseFloat(document.getElementById('editTxFee').value || 0);
    const crypto = (document.getElementById('editTxCrypto').value || '').toUpperCase();
    const network = (document.getElementById('editTxNetwork').value || '').toLowerCase();
    const address = document.getElementById('editTxAddress').value || '';
    const tx_hash = document.getElementById('editTxHash').value || '';
    const createdLocal = document.getElementById('editTxCreated').value; // yyyy-MM-ddTHH:mm
    let created_timestamp = null;
    if (createdLocal) {
        // Преобразуем локальное время в ISO
        const dt = new Date(createdLocal);
        if (!isNaN(dt.getTime())) {
            created_timestamp = dt.toISOString();
        }
    }
    try {
        const resp = await fetch(`/api/transactions?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, tx_hash, type, amount, fee, address, crypto, network, created_timestamp })
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения');
        showNotification('✅ Транзакция обновлена', 'success');
        closeModal('editTransactionModal');
        loadTransactions();
    } catch (e) {
        console.error(e);
        showNotification('❌ Ошибка сохранения транзакции: ' + e.message, 'error');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Вы уверены, что хотите удалить эту транзакцию? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/transactions?admin=true&id=${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('✅ Транзакция удалена', 'success');
            loadTransactions(); // Перезагружаем таблицу
        } else {
            throw new Error(data.error || 'Ошибка удаления транзакции');
        }
        
    } catch (error) {
        console.error('❌ Ошибка удаления транзакции:', error);
        showNotification('❌ Ошибка удаления транзакции: ' + error.message, 'error');
    }
}

function refreshTransactions() {
    loadTransactions();
}

// ======================== BULK DELETE ========================

function toggleSelectAllTx(master) {
    const checks = document.querySelectorAll('.tx-select');
    checks.forEach(c => c.checked = master.checked);
    updateTxSelectionState();
}

function getSelectedTransactionIds() {
    return Array.from(document.querySelectorAll('.tx-select:checked')).map(el => el.dataset.id);
}

function updateTxSelectionState() {
    const selected = getSelectedTransactionIds();
    const btn = document.getElementById('bulkDeleteBtn');
    if (btn) btn.disabled = selected.length === 0;
}

async function deleteSelectedTransactions() {
    const ids = getSelectedTransactionIds();
    if (ids.length === 0) return;
    if (!confirm(`Удалить выбранные транзакции (${ids.length} шт.)? Это действие нельзя отменить.`)) return;
    try {
        // Удаляем последовательно (Supabase REST не поддерживает массив id через один параметр здесь)
        for (const id of ids) {
            const response = await fetch(`/api/transactions?admin=true&id=${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`ID ${id}: ${text}`);
            }
        }
        showNotification(`✅ Удалено транзакций: ${ids.length}`, 'success');
        loadTransactions();
    } catch (e) {
        console.error('Bulk delete error:', e);
        showNotification('❌ Ошибка массового удаления: ' + e.message, 'error');
    }
}

// ======================== ДОБАВЛЕНИЕ ТРАНЗАКЦИИ ========================

function showAddTransactionModal() {
    document.getElementById('addTransactionModal').style.display = 'block';
    
    // Очищаем форму
    document.getElementById('addTransactionForm').reset();
    
    // Генерируем случайный хеш если поле пустое
    const hashField = document.getElementById('txHash');
    if (!hashField.value) {
        hashField.placeholder = 'Будет сгенерирован автоматически';
    }
}

async function addTransaction() {
    const form = document.getElementById('addTransactionForm');
    const formData = new FormData(form);
    
    // Собираем данные из формы
    const transactionData = {
        user_telegram_id: parseInt(formData.get('txTelegramId')),
        transaction_type: formData.get('txType'),
        crypto_currency: formData.get('txCurrency'),
        blockchain_network: formData.get('txNetwork'),
        withdraw_amount: parseFloat(formData.get('txAmount')),
        network_fee: parseFloat(formData.get('txFee')) || 0,
        recipient_address: formData.get('txAddress'),
        blockchain_hash: formData.get('txHash') || generateTransactionHash(),
        transaction_status: formData.get('txStatus'),
        user_comment: formData.get('txComment') || `Админская транзакция (${formData.get('txType')})`
    };
    
    // Валидация
    if (!transactionData.user_telegram_id || !transactionData.transaction_type || 
        !transactionData.crypto_currency || !transactionData.blockchain_network ||
        !transactionData.withdraw_amount || !transactionData.recipient_address) {
        showNotification('❌ Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    if (transactionData.withdraw_amount <= 0) {
        showNotification('❌ Сумма должна быть больше 0', 'error');
        return;
    }
    
    try {
        // Сначала добавляем транзакцию в wallet_transactions
        const txResponse = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                action: 'add_admin_transaction',
                ...transactionData 
            })
        });
        
        if (!txResponse.ok) {
            throw new Error(`HTTP error! status: ${txResponse.status}`);
        }
        
        const txResult = await txResponse.json();
        
        if (!txResult.success) {
            throw new Error(txResult.error || 'Ошибка создания транзакции');
        }
        
        // Обновляем баланс ТОЛЬКО если статус "completed"
        let balanceUpdated = false;
        if (transactionData.transaction_status === 'completed') {
            const balanceChange = transactionData.transaction_type === 'deposit' 
                ? transactionData.withdraw_amount 
                : -transactionData.withdraw_amount;
                
            const balanceResponse = await fetch('/api/admin/balances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update_balance',
                    telegram_id: transactionData.user_telegram_id,
                    currency: transactionData.crypto_currency.toLowerCase(),
                    amount_change: balanceChange,
                    reason: `admin_transaction_${transactionData.transaction_type}`
                })
            });
            
            if (balanceResponse.ok) {
                balanceUpdated = true;
            } else {
                console.warn('Транзакция создана, но баланс не обновлен');
            }
        }
        
        // Закрываем модальное окно и обновляем данные
        closeModal('addTransactionModal');
        
        let statusMessage = '';
        if (transactionData.transaction_status === 'completed') {
            statusMessage = balanceUpdated ? ' (баланс обновлен)' : ' (баланс НЕ обновлен)';
        } else if (transactionData.transaction_status === 'pending') {
            statusMessage = ' (в ожидании, баланс не изменен)';
        } else {
            statusMessage = ' (отклонена, баланс не изменен)';
        }
        
        showNotification(`✅ Транзакция добавлена! Статус: ${transactionData.transaction_status}${statusMessage}`, 'success');
        
        // Обновляем таблицы
        loadTransactions();
        if (currentTab === 'balances') {
            loadBalances();
        }
        
    } catch (error) {
        console.error('❌ Ошибка добавления транзакции:', error);
        showNotification('❌ Ошибка добавления транзакции: ' + error.message, 'error');
    }
}

function generateTransactionHash() {
    // Генерируем псевдо-хеш транзакции
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'admin_';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ======================== НАСТРОЙКИ КОМИССИЙ ========================
async function loadSettings() {
    try {
        // Убеждаемся что находимся на вкладке настроек
        if (!document.querySelector('#settings-tab.active')) {
            console.log('🔄 Переключаемся на вкладку настроек...');
            showTab('settings');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const resp = await fetch('/api/admin/settings');
        const data = await resp.json();
        console.log('📋 Ответ настроек:', data);
        if (!resp.ok || !data.success) throw new Error(data.error || 'Ошибка ответа');
        
        // Поддержка двух форматов ответа: массив withdraw_fees {network,fee}
        // или app_settings {key,value}
        const map = {};
        (data.settings || []).forEach(r => {
            if (r.network !== undefined) map[r.network] = r.fee;
            if (r.key !== undefined) map[r.key] = r.value;
        });
        console.log('💰 Карта настроек:', map);
        
        const tonFee = parseFloat(map['ton'] ?? map['fee_ton'] ?? 0);
        const tronFee = parseFloat(map['tron'] ?? map['fee_tron'] ?? 0);
        const solFee = parseFloat(map['sol'] ?? map['fee_sol'] ?? 0);
        const ethFee = parseFloat(map['eth'] ?? map['fee_eth'] ?? 0);
        const bnbFee = parseFloat(map['bnb'] ?? map['fee_bnb'] ?? 0);
        
        console.log('🔢 Значения для инпутов:', { tonFee, tronFee, solFee, ethFee, bnbFee });
        
        // Многократно пытаемся установить значения с задержками
        const setWithRetry = async (id, value, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                await new Promise(resolve => setTimeout(resolve, 50 * i));
                setInputValue(id, value);
                const el = document.getElementById(id);
                if (el && el.value == value) {
                    console.log(`✅ ${id} успешно установлен: ${value}`);
                    break;
                }
                console.log(`⚠️ ${id} попытка ${i + 1}/${retries}`);
            }
        };
        
        await Promise.all([
            setWithRetry('fee-ton', tonFee),
            setWithRetry('fee-tron', tronFee),
            setWithRetry('fee-sol', solFee),
            setWithRetry('fee-eth', ethFee),
            setWithRetry('fee-bnb', bnbFee)
        ]);
        
        // Финальная проверка и принудительное обновление DOM
        setTimeout(() => {
            ['fee-ton', 'fee-tron', 'fee-sol', 'fee-eth', 'fee-bnb'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    console.log(`🔍 Финальная проверка ${id}: value="${el.value}"`);
                    // Принудительно перерисовываем элемент
                    el.style.display = 'none';
                    el.offsetHeight; // force reflow
                    el.style.display = '';
                }
            });
        }, 200);
        
        showNotification('Настройки загружены', 'success');
    } catch (e) {
        console.error('Ошибка загрузки настроек:', e);
        showNotification('Не удалось загрузить настройки', 'error');
    }
}

async function saveSettings() {
    try {
        // Передаём в формате withdraw_fees
        const settings = [
            { network: 'ton', fee: getInputNumber('fee-ton') },
            { network: 'tron', fee: getInputNumber('fee-tron') },
            { network: 'sol', fee: getInputNumber('fee-sol') },
            { network: 'eth', fee: getInputNumber('fee-eth') },
            { network: 'bnb', fee: getInputNumber('fee-bnb') },
        ];
        const resp = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings })
        });
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения');
        showNotification('Настройки сохранены', 'success');
    } catch (e) {
        console.error('Ошибка сохранения настроек:', e);
        showNotification('Не удалось сохранить настройки', 'error');
    }
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn('settings: input not found', id);
        return false;
    }
    const num = isNaN(value) ? 0 : Number(value);
    console.log(`🎯 Setting ${id} = ${num} (original: ${value})`);
    
    // Убеждаемся что элемент видим
    if (el.offsetParent === null && el.style.display !== 'none') {
        console.warn(`⚠️ ${id} element might be hidden`);
        // Принудительно показываем
        el.style.visibility = 'visible';
        el.style.opacity = '1';
    }
    
    // Множественные способы установки значения
    el.value = num.toString();
    el.setAttribute('value', num.toString());
    if ('valueAsNumber' in el) {
        el.valueAsNumber = num;
    }
    
    // Принудительно обновляем отображение
    el.defaultValue = num.toString();
    
    // Проверяем что значение установилось
    console.log(`✅ ${id} after set: value="${el.value}", valueAsNumber=${el.valueAsNumber}`);
    
    // Принудительно триггерим события и обновления
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // Принудительный reflow
    el.focus();
    el.blur();
    
    return el.value == num;
}

function getInputNumber(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
}

// upsertSetting больше не нужен — используется /api/admin/settings
