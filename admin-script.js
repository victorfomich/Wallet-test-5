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
    
    // Заполняем форму
    document.getElementById('editSetId').value = addressSet.id;
    document.getElementById('editSetName').value = addressSet.name;
    document.getElementById('editTonAddress').value = addressSet.ton_address || '';
    document.getElementById('editTronAddress').value = addressSet.tron_address || '';
    document.getElementById('editSolAddress').value = addressSet.sol_address || '';
    document.getElementById('editEthAddress').value = addressSet.eth_address || '';
    document.getElementById('editBnbAddress').value = addressSet.bnb_address || '';
    
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
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/address-sets/${id}`, {
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
