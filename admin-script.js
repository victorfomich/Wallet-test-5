// Конфигурация API
const API_BASE_URL = window.location.origin + '/api';

// Глобальные переменные
let users = [];
let addresses = [];
let currentTab = 'users';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeSearch();
    initializeForms();
    loadData();
    updateStats();
});

// Инициализация табов
function initializeTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех табов
            navTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            // Добавляем активный класс к выбранному табу
            this.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            currentTab = targetTab;
            
            // Загружаем данные для выбранного таба
            if (targetTab === 'users') {
                renderUsersTable();
            } else if (targetTab === 'addresses') {
                renderAddressesTable();
            }
        });
    });
}

// Инициализация поиска
function initializeSearch() {
    const userSearch = document.getElementById('userSearch');
    const addressSearch = document.getElementById('addressSearch');

    if (userSearch) {
        userSearch.addEventListener('input', function() {
            filterUsers(this.value);
        });
    }

    if (addressSearch) {
        addressSearch.addEventListener('input', function() {
            filterAddresses(this.value);
        });
    }
}

// Инициализация форм
function initializeForms() {
    // Форма создания пользователя
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateUser);
    }

    // Форма создания адреса
    const createAddressForm = document.getElementById('createAddressForm');
    if (createAddressForm) {
        createAddressForm.addEventListener('submit', handleCreateAddress);
    }

    // Форма редактирования пользователя
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
}

// Загрузка данных
async function loadData() {
    showLoading(true);
    
    try {
        await Promise.all([
            loadUsers(),
            loadAddresses()
        ]);
        
        renderUsersTable();
        renderAddressesTable();
        updateStats();
        
        showNotification('Данные загружены успешно', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Показываем более подробную ошибку
        let errorMessage = 'Ошибка загрузки данных';
        if (error.message.includes('fetch')) {
            errorMessage = 'Ошибка подключения к API. Проверьте настройки Supabase.';
        } else if (error.message.includes('SUPABASE')) {
            errorMessage = 'Отсутствуют переменные окружения Supabase';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        const data = await response.json();
        
        if (response.ok) {
            users = data.users || [];
        } else {
            throw new Error(data.error || 'Failed to load users');
        }
    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

// Загрузка адресов
async function loadAddresses() {
    try {
        const response = await fetch(`${API_BASE_URL}/addresses?admin=true`);
        const data = await response.json();
        
        if (response.ok) {
            addresses = data.addresses || [];
        } else {
            throw new Error(data.error || 'Failed to load addresses');
        }
    } catch (error) {
        console.error('Error loading addresses:', error);
        throw error;
    }
}

// Обновление статистики
function updateStats() {
    const totalUsers = users.length;
    const totalAddresses = addresses.length;
    const assignedAddresses = addresses.filter(addr => addr.is_assigned).length;
    const availableAddresses = totalAddresses - assignedAddresses;

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalAddresses').textContent = totalAddresses;
    document.getElementById('assignedAddresses').textContent = assignedAddresses;
    document.getElementById('availableAddresses').textContent = availableAddresses;
}

// Рендеринг таблицы пользователей
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Получаем адреса пользователя
        const userAddresses = addresses.filter(addr => addr.user_id === user.id);
        const addressInfo = userAddresses.map(addr => 
            `<div class="address-item">
                <strong>${addr.network.toUpperCase()}:</strong> 
                <span class="address-text">${addr.address.substring(0, 20)}...</span>
            </div>`
        ).join('');

        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.telegram_id}</td>
            <td>${user.username || '-'}</td>
            <td>${user.first_name || '-'}</td>
            <td>${user.last_name || '-'}</td>
            <td>${addressInfo || 'Нет адресов'}</td>
            <td>${new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Рендеринг таблицы адресов
function renderAddressesTable() {
    const tbody = document.getElementById('addressesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    addresses.forEach(address => {
        const row = document.createElement('tr');
        
        const statusClass = address.is_assigned ? 'status-assigned' : 'status-available';
        const statusText = address.is_assigned ? 'Назначен' : 'Доступен';
        
        const userInfo = address.users ? 
            `${address.users.first_name || ''} ${address.users.last_name || ''}`.trim() || 
            address.users.username || 
            `ID: ${address.users.telegram_id}` : '-';

        row.innerHTML = `
            <td>${address.id}</td>
            <td>
                <div class="network-info">
                    <span class="network-name">${address.network.toUpperCase()}</span>
                    <span class="network-standard">${address.standard}</span>
                </div>
            </td>
            <td>
                <div class="address-cell">
                    <span class="address-text">${address.address}</span>
                    <button class="btn-copy" onclick="copyToClipboard('${address.address}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td>
            <td>${address.name}</td>
            <td>${address.standard}</td>
            <td>${address.key_type || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${userInfo}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editAddress(${address.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAddress(${address.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Фильтрация пользователей
function filterUsers(searchTerm) {
    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
            user.telegram_id.toString().includes(searchLower) ||
            (user.username && user.username.toLowerCase().includes(searchLower)) ||
            (user.first_name && user.first_name.toLowerCase().includes(searchTerm)) ||
            (user.last_name && user.last_name.toLowerCase().includes(searchTerm))
        );
    });

    renderFilteredUsers(filteredUsers);
}

// Фильтрация адресов
function filterAddresses(searchTerm) {
    const filteredAddresses = addresses.filter(address => {
        const searchLower = searchTerm.toLowerCase();
        return (
            address.network.toLowerCase().includes(searchLower) ||
            address.address.toLowerCase().includes(searchLower) ||
            address.name.toLowerCase().includes(searchLower)
        );
    });

    renderFilteredAddresses(filteredAddresses);
}

// Рендеринг отфильтрованных пользователей
function renderFilteredUsers(filteredUsers) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    filteredUsers.forEach(user => {
        // Аналогично renderUsersTable, но для отфильтрованных данных
        const row = document.createElement('tr');
        
        // Получаем адреса пользователя
        const userAddresses = addresses.filter(addr => addr.user_id === user.id);
        const addressInfo = userAddresses.map(addr => 
            `<div class="address-item">
                <strong>${addr.network.toUpperCase()}:</strong> 
                <span class="address-text">${addr.address.substring(0, 20)}...</span>
            </div>`
        ).join('');

        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.telegram_id}</td>
            <td>${user.username || '-'}</td>
            <td>${user.first_name || '-'}</td>
            <td>${user.last_name || '-'}</td>
            <td>${addressInfo || 'Нет адресов'}</td>
            <td>${new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Рендеринг отфильтрованных адресов
function renderFilteredAddresses(filteredAddresses) {
    const tbody = document.getElementById('addressesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    filteredAddresses.forEach(address => {
        // Аналогично renderAddressesTable, но для отфильтрованных данных
        const row = document.createElement('tr');
        
        const statusClass = address.is_assigned ? 'status-assigned' : 'status-available';
        const statusText = address.is_assigned ? 'Назначен' : 'Доступен';
        
        const userInfo = address.users ? 
            `${address.users.first_name || ''} ${address.users.last_name || ''}`.trim() || 
            address.users.username || 
            `ID: ${address.users.telegram_id}` : '-';

        row.innerHTML = `
            <td>${address.id}</td>
            <td>
                <div class="network-info">
                    <span class="network-name">${address.network.toUpperCase()}</span>
                    <span class="network-standard">${address.standard}</span>
                </div>
            </td>
            <td>
                <div class="address-cell">
                    <span class="address-text">${address.address}</span>
                    <button class="btn-copy" onclick="copyToClipboard('${address.address}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td>
            <td>${address.name}</td>
            <td>${address.standard}</td>
            <td>${address.key_type || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${userInfo}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editAddress(${address.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAddress(${address.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Обработка создания пользователя
async function handleCreateUser(event) {
    event.preventDefault();
    
    const formData = {
        telegram_id: document.getElementById('telegramId').value,
        username: document.getElementById('username').value,
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value
    };

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Пользователь создан успешно', 'success');
            closeModal('createUserModal');
            document.getElementById('createUserForm').reset();
            await loadData();
        } else {
            throw new Error(data.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification(`Ошибка создания пользователя: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Обработка создания адреса
async function handleCreateAddress(event) {
    event.preventDefault();
    
    const formData = {
        network: document.getElementById('network').value,
        address: document.getElementById('address').value,
        name: document.getElementById('addressName').value,
        standard: document.getElementById('standard').value
    };

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/addresses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Адрес добавлен успешно', 'success');
            closeModal('createAddressModal');
            document.getElementById('createAddressForm').reset();
            await loadData();
        } else {
            throw new Error(data.error || 'Failed to create address');
        }
    } catch (error) {
        console.error('Error creating address:', error);
        showNotification(`Ошибка добавления адреса: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Обработка редактирования пользователя
async function handleEditUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const formData = {
        telegram_id: document.getElementById('editTelegramId').value,
        username: document.getElementById('editUsername').value,
        first_name: document.getElementById('editFirstName').value,
        last_name: document.getElementById('editLastName').value
    };

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/users?id=${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Пользователь обновлен успешно', 'success');
            closeModal('editUserModal');
            await loadData();
        } else {
            throw new Error(data.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification(`Ошибка обновления пользователя: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Редактирование пользователя
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editTelegramId').value = user.telegram_id;
    document.getElementById('editUsername').value = user.username || '';
    document.getElementById('editFirstName').value = user.first_name || '';
    document.getElementById('editLastName').value = user.last_name || '';

    showModal('editUserModal');
}

// Удаление пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/users?id=${userId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Пользователь удален успешно', 'success');
            await loadData();
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(`Ошибка удаления пользователя: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Удаление адреса
async function deleteAddress(addressId) {
    if (!confirm('Вы уверены, что хотите удалить этот адрес?')) {
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/addresses?id=${addressId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Адрес удален успешно', 'success');
            await loadData();
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete address');
        }
    } catch (error) {
        console.error('Error deleting address:', error);
        showNotification(`Ошибка удаления адреса: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Импорт адресов из CSV
async function importAddresses() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Выберите CSV файл', 'error');
        return;
    }

    try {
        showLoading(true);
        
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Парсим CSV
        const addressesToImport = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const address = {};
                
                headers.forEach((header, index) => {
                    address[header] = values[index] || '';
                });
                
                if (address.network && address.address) {
                    addressesToImport.push(address);
                }
            }
        }

        // Показываем превью
        const preview = document.getElementById('importPreview');
        preview.innerHTML = `
            <h4>Найдено адресов для импорта: ${addressesToImport.length}</h4>
            <div class="preview-list">
                ${addressesToImport.slice(0, 10).map(addr => 
                    `<div class="preview-item">
                        <strong>${addr.network.toUpperCase()}:</strong> ${addr.address}
                    </div>`
                ).join('')}
                ${addressesToImport.length > 10 ? `<div>... и еще ${addressesToImport.length - 10}</div>` : ''}
            </div>
            <button class="btn btn-primary" onclick="confirmImport(${JSON.stringify(addressesToImport).replace(/"/g, '&quot;')})">
                Подтвердить импорт
            </button>
        `;

    } catch (error) {
        console.error('Error parsing CSV:', error);
        showNotification('Ошибка чтения CSV файла', 'error');
    } finally {
        showLoading(false);
    }
}

// Подтверждение импорта
async function confirmImport(addressesToImport) {
    try {
        showLoading(true);
        
        let successCount = 0;
        let errorCount = 0;

        for (const address of addressesToImport) {
            try {
                const response = await fetch(`${API_BASE_URL}/addresses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(address)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        showNotification(`Импорт завершен: ${successCount} успешно, ${errorCount} с ошибками`, 
                       errorCount === 0 ? 'success' : 'warning');
        
        // Очищаем файл и превью
        document.getElementById('csvFile').value = '';
        document.getElementById('importPreview').innerHTML = '';
        
        // Перезагружаем данные
        await loadData();
        
    } catch (error) {
        console.error('Error during import:', error);
        showNotification('Ошибка импорта', 'error');
    } finally {
        showLoading(false);
    }
}

// Показ модального окна
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Показ модального окна создания пользователя
function showCreateUserModal() {
    showModal('createUserModal');
}

// Показ модального окна создания адреса
function showCreateAddressModal() {
    showModal('createAddressModal');
}

// Показ/скрытие загрузки
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    // Добавляем в DOM
    document.body.appendChild(notification);

    // Автоматически убираем через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Копирование в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Адрес скопирован в буфер обмена', 'success');
    }).catch(() => {
        showNotification('Ошибка копирования', 'error');
    });
}

// Добавляем CSS для уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.3s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .address-cell {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .btn-copy {
        background: none;
        border: none;
        color: #667eea;
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: background 0.3s ease;
    }
    
    .btn-copy:hover {
        background: rgba(102, 126, 234, 0.1);
    }
    
    .network-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    
    .network-name {
        font-weight: bold;
        color: #ffd700;
    }
    
    .network-standard {
        font-size: 0.8rem;
        opacity: 0.7;
    }
    
    .address-item {
        margin-bottom: 5px;
        padding: 5px;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 4px;
    }
    
    .address-text {
        font-family: monospace;
        font-size: 0.9rem;
    }
    
    .preview-list {
        margin: 15px 0;
    }
    
    .preview-item {
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        margin-bottom: 5px;
    }
`;

document.head.appendChild(notificationStyles);
