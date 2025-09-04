let tg = window.Telegram.WebApp;
let currentBalance = 0;

document.addEventListener('DOMContentLoaded', function() {
    if (tg && tg.ready) tg.ready();
    document.documentElement.setAttribute('data-theme', 'dark');
    initHandlers();
    loadUserBalance();
    initBackButton();
});

function initHandlers() {
    document.getElementById('pasteBtn').addEventListener('click', pasteAddress);
    document.getElementById('maxBtn').addEventListener('click', setMaxAmount);
    document.getElementById('addCommentBtn').addEventListener('click', toggleComment);
    document.getElementById('amountInput').addEventListener('input', function() { validateForm(); updateFeeInfo(); });
    document.getElementById('continueBtn').addEventListener('click', handleWithdraw);
}

async function pasteAddress() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('addressInput').value = text;
        validateForm();
        if (tg && tg.showAlert) { tg.showAlert('Адрес вставлен'); }
    } catch {}
}

function setMaxAmount() {
    const amountInput = document.getElementById('amountInput');
    amountInput.value = currentBalance.toFixed(8);
    validateForm();
}

function updateFeeInfo() {
    const amount = parseFloat(document.getElementById('amountInput').value) || 0;
    document.getElementById('networkFee').textContent = '0.01 SOL';
    document.getElementById('totalAmount').textContent = `${amount.toFixed(8)} SOL`;
}

function toggleComment() {
    const c = document.getElementById('commentContainer');
    const b = document.getElementById('addCommentBtn');
    if (c.style.display === 'none') { c.style.display = 'block'; b.textContent = '- Убрать комментарий'; }
    else { c.style.display = 'none'; b.textContent = '+ Добавить комментарий'; document.getElementById('commentInput').value = ''; }
}

function validateForm() {
    const address = document.getElementById('addressInput').value.trim();
    const amountStr = document.getElementById('amountInput').value;
    const amount = parseFloat(amountStr);
    const btn = document.getElementById('continueBtn');
    const isValid = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && amountStr && amount > 0 && amount <= currentBalance;
    btn.disabled = !isValid;
    document.getElementById('amountInput').style.borderColor = amountStr && amount > currentBalance ? '#ff4444' : '';
}

async function loadUserBalance() {
    try {
        const telegramId = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || 'demo_user';
        const res = await fetch(`/api/admin/balances?telegram_id=${telegramId}`);
        const data = await res.json();
        currentBalance = data?.balance?.sol_amount ?? 0;
        updateBalanceDisplay();
    } catch {
        currentBalance = 0; updateBalanceDisplay();
    }
}

function updateBalanceDisplay() {
    const balanceAmount = document.querySelector('.balance-amount');
    const balanceUsd = document.querySelector('.balance-usd');
    if (balanceAmount) balanceAmount.textContent = `${currentBalance.toFixed(8)} SOL`;
    if (balanceUsd) {
        const usd = (currentBalance * 142.67).toFixed(3);
        balanceUsd.textContent = `$${usd}`;
    }
}

function initBackButton() {
    if (tg && tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => { window.location.href = 'withdraw.html'; });
    }
}

async function handleWithdraw() {
    try {
        const address = document.getElementById('addressInput').value.trim();
        const amount = parseFloat(document.getElementById('amountInput').value);
        const comment = document.getElementById('commentInput').value.trim();
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return alert('Неверный SOL адрес');
        if (!amount || amount <= 0) return alert('Введите корректную сумму');
        if (amount > currentBalance) return alert(`Недостаточно средств. Баланс: ${currentBalance} SOL`);

        const telegramId = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) || 123456789;
        const btn = document.getElementById('continueBtn');
        const original = btn.textContent; btn.disabled = true; btn.textContent = 'Обработка...';

        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: telegramId,
                type: 'withdraw',
                crypto: 'SOL',
                network: 'sol',
                amount: amount,
                fee: 0.01,
                address: address,
                comment: comment || null
            })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            currentBalance = result.new_balance; updateBalanceDisplay();
            alert(`Транзакция на вывод ${amount} SOL создана!`);
            document.getElementById('addressInput').value = '';
            document.getElementById('amountInput').value = '';
            document.getElementById('commentInput').value = '';
            setTimeout(() => { window.location.href = 'withdraw.html'; }, 1500);
        } else {
            alert(`Ошибка: ${result.error || 'Неизвестная ошибка'}`);
        }
        btn.disabled = false; btn.textContent = original;
    } catch (e) {
        alert('Произошла ошибка при создании транзакции');
        const btn = document.getElementById('continueBtn');
        btn.disabled = false; btn.textContent = 'Продолжить';
    }
}


