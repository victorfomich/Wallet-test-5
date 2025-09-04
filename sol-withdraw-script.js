let tg = window.Telegram.WebApp;
let currentBalance = 0;
let feeSol = 0; // комиссия из админки (SOL)

document.addEventListener('DOMContentLoaded', function() {
    if (tg && tg.ready) tg.ready();
    document.documentElement.setAttribute('data-theme', 'dark');
    initHandlers();
    // загрузим комиссию SOL из настроек
    fetch('/api/admin/settings').then(r=>r.json()).then(d=>{
        if (d?.success && Array.isArray(d.settings)) {
            const sol = d.settings.find(s=> (s.network||'').toLowerCase()==='sol');
            feeSol = parseFloat(sol?.fee)||0;
            updateFeeInfo();
        }
    }).catch(()=>{});
    loadUserBalance();
    initBackButton();
});

function initHandlers() {
    document.getElementById('pasteBtn').addEventListener('click', pasteAddress);
    document.getElementById('maxBtn').addEventListener('click', setMaxAmount);
    document.getElementById('addCommentBtn').addEventListener('click', toggleComment);
    document.getElementById('addressInput').addEventListener('input', function() { validateForm(); });
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
    const maxNet = Math.max(0, currentBalance - (feeSol||0));
    amountInput.value = maxNet.toFixed(8);
    validateForm();
}

function updateFeeInfo() {
    const amount = parseFloat(document.getElementById('amountInput').value) || 0;
    const fee = feeSol || 0;
    document.getElementById('networkFee').textContent = `${fee} SOL`;
    const total = amount + fee;
    document.getElementById('totalAmount').textContent = `${total.toFixed(8)} SOL`;
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
    const isValid = address.length > 0 && amountStr && amount > 0 && amount <= currentBalance;
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
        // Формат адреса не проверяем
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
                amount: amount + (feeSol||0),
                fee: (feeSol||0),
                address: address,
                comment: comment || null
            })
        });
        const result = await response.json();
        if (response.ok && result.success) {
            currentBalance = result.new_balance; updateBalanceDisplay();
            const total = amount + (feeSol||0);
            alert(`Транзакция на вывод ${total.toFixed(8)} SOL (вкл. комиссию сети) создана!`);
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


