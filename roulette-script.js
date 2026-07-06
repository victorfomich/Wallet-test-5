const PRIZES = [0.1, 0.5, 0.8, 1, 2, 5, 10, 100];
const SPIN_COST = 1;
const TICKET_HEIGHT = 88;
const TICKET_GAP = 10;
const TICKET_STEP = TICKET_HEIGHT + TICKET_GAP;
const REPEAT_COUNT = 20;

let tg = window.Telegram?.WebApp;
let state = {
    telegramId: null,
    usdtBalance: 0,
    isSpinning: false,
    currentSpinId: null
};

document.addEventListener('DOMContentLoaded', async () => {
    if (tg?.ready) tg.ready();
    const user = tg?.initDataUnsafe?.user;
    if (user?.id) state.telegramId = user.id;

    setupUI();
    buildReel();
    await loadBalance();
    centerReelOnIndex(getMiddleIndex());
});

function setupUI() {
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    document.getElementById('spinBtn').addEventListener('click', handleSpin);
}

function getTicketClass(amount) {
    if (amount >= 100) return 'ticket-gold';
    if (amount >= 5) return 'ticket-blue';
    if (amount >= 1) return 'ticket-teal';
    return 'ticket-green';
}

function formatAmount(amount) {
    if (amount >= 100) return '100';
    if (amount >= 10) return String(amount);
    if (Number.isInteger(amount)) return String(amount);
    return String(amount);
}

function buildReel() {
    const track = document.getElementById('reelTrack');
    track.innerHTML = '';

    const items = [];
    for (let r = 0; r < REPEAT_COUNT; r++) {
        for (const prize of PRIZES) {
            items.push(prize);
        }
    }

    items.forEach(amount => {
        const ticket = document.createElement('div');
        ticket.className = `ticket ${getTicketClass(amount)}`;
        ticket.dataset.amount = amount;
        ticket.innerHTML = `
            <div class="ticket-icon">
                <img src="usdt.png" alt="USDT">
            </div>
            <div class="ticket-amount-wrap">
                <span class="ticket-amount">${formatAmount(amount)}</span>
                <span class="ticket-label">Tether</span>
            </div>
        `;
        track.appendChild(ticket);
    });
}

function getMiddleIndex() {
    const total = PRIZES.length * REPEAT_COUNT;
    return Math.floor(total / 2);
}

function getViewportCenter() {
    return TICKET_STEP * 1.5;
}

function centerReelOnIndex(index, animate = false) {
    const track = document.getElementById('reelTrack');
    const offset = index * TICKET_STEP - getViewportCenter() + TICKET_HEIGHT / 2;

    if (animate) {
        track.style.transition = 'none';
    } else {
        track.style.transition = 'none';
    }
    track.style.transform = `translateY(${-offset}px)`;
    return offset;
}

function findTargetIndex(prizeAmount, fromIndex) {
    const tickets = document.querySelectorAll('#reelTrack .ticket');
    const minIndex = fromIndex + PRIZES.length * 3;
    const maxIndex = fromIndex + PRIZES.length * 8;

    const candidates = [];
    tickets.forEach((t, i) => {
        if (i >= minIndex && i <= maxIndex && parseFloat(t.dataset.amount) === prizeAmount) {
            candidates.push(i);
        }
    });

    if (candidates.length === 0) {
        for (let i = minIndex; i < tickets.length; i++) {
            if (parseFloat(tickets[i].dataset.amount) === prizeAmount) {
                return i;
            }
        }
        return minIndex;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

function animateToIndex(targetIndex, duration = 4000) {
    return new Promise(resolve => {
        const track = document.getElementById('reelTrack');
        const offset = targetIndex * TICKET_STEP - getViewportCenter() + TICKET_HEIGHT / 2;

        track.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
        track.style.transform = `translateY(${-offset}px)`;

        setTimeout(() => {
            track.style.transition = 'none';
            resolve();
        }, duration + 50);
    });
}

async function loadBalance() {
    if (!state.telegramId) {
        updateBalanceUI(0);
        return;
    }

    try {
        const resp = await fetch(`/api/transactions?roulette=1&telegram_id=${state.telegramId}`);
        const data = await resp.json();
        if (data.success) {
            state.usdtBalance = data.usdt_balance;
            updateBalanceUI(state.usdtBalance);
        }
    } catch (e) {
        console.error('Failed to load balance:', e);
    }
}

function updateBalanceUI(balance) {
    const el = document.getElementById('usdtBalance');
    const btn = document.getElementById('spinBtn');
    const formatted = formatBalance(balance);
    el.textContent = `${formatted} USDT`;
    btn.disabled = balance < SPIN_COST || state.isSpinning;
}

function formatBalance(n) {
    const num = parseFloat(n) || 0;
    if (num === 0) return '0';
    if (num >= 1) return num.toFixed(2);
    return num.toFixed(4);
}

async function handleSpin() {
    if (state.isSpinning || !state.telegramId) return;
    if (state.usdtBalance < SPIN_COST) return;

    state.isSpinning = true;
    const btn = document.getElementById('spinBtn');
    const resultBanner = document.getElementById('resultBanner');
    btn.classList.add('spinning');
    btn.disabled = true;
    btn.textContent = 'Крутим...';
    resultBanner.style.display = 'none';

    let spinId, prizeAmount;

    try {
        const startResp = await fetch('/api/transactions?roulette=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'spin_start',
                telegram_id: state.telegramId
            })
        });
        const startData = await startResp.json();

        if (!startData.success) {
            throw new Error(startData.error || 'Ошибка спина');
        }

        spinId = startData.spin_id;
        prizeAmount = startData.prize_amount;
        state.currentSpinId = spinId;
        state.usdtBalance = startData.usdt_balance;
        updateBalanceUI(state.usdtBalance);

        const currentOffset = getCurrentTrackOffset();
        const currentIndex = Math.round((currentOffset + getViewportCenter() - TICKET_HEIGHT / 2) / TICKET_STEP);
        const targetIndex = findTargetIndex(prizeAmount, currentIndex);

        await animateToIndex(targetIndex, 3800);

        const completeResp = await fetch('/api/transactions?roulette=1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'spin_complete',
                telegram_id: state.telegramId,
                spin_id: spinId
            })
        });
        const completeData = await completeResp.json();

        if (completeData.success) {
            state.usdtBalance = completeData.usdt_balance;
            updateBalanceUI(state.usdtBalance);

            document.getElementById('resultPrize').textContent = formatAmount(prizeAmount);
            resultBanner.style.display = 'block';

            if (tg?.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (e) {
        console.error('Spin error:', e);
        if (tg?.showAlert) {
            tg.showAlert(e.message || 'Ошибка при вращении');
        } else {
            alert(e.message || 'Ошибка при вращении');
        }
        await loadBalance();
    } finally {
        state.isSpinning = false;
        state.currentSpinId = null;
        btn.classList.remove('spinning');
        btn.textContent = 'Крутить за $1';
        updateBalanceUI(state.usdtBalance);
    }
}

function getCurrentTrackOffset() {
    const track = document.getElementById('reelTrack');
    const transform = track.style.transform || '';
    const match = transform.match(/translateY\((-?\d+\.?\d*)px\)/);
    return match ? Math.abs(parseFloat(match[1])) : 0;
}
