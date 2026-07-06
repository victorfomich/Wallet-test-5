const PRIZES = [0.1, 0.5, 0.8, 1, 2, 5, 10, 100];
const SPIN_COST = 1;
const REPEAT_COUNT = 24;
const CYCLE_LEN = PRIZES.length;
const MIDDLE_CYCLE = Math.floor(REPEAT_COUNT / 2);

let tg = window.Telegram?.WebApp;
let state = {
    telegramId: null,
    usdtBalance: 0,
    isSpinning: false,
    currentSpinId: null,
    currentIndex: MIDDLE_CYCLE * CYCLE_LEN
};

let metrics = {
    ticketHeight: 88,
    ticketGap: 10,
    ticketStep: 98,
    viewportHeight: 284
};

document.addEventListener('DOMContentLoaded', async () => {
    if (tg?.ready) tg.ready();
    const user = tg?.initDataUnsafe?.user;
    if (user?.id) state.telegramId = user.id;

    setupUI();
    buildReel();
    await waitForLayout();
    syncMetrics();
    setTrackIndex(state.currentIndex, false);
    await loadBalance();
});

function setupUI() {
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('spinBtn').addEventListener('click', handleSpin);
}

function waitForLayout() {
    return new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
}

function syncMetrics() {
    const rootStyle = getComputedStyle(document.documentElement);
    metrics.ticketHeight = parseFloat(rootStyle.getPropertyValue('--ticket-height')) || 88;
    metrics.ticketGap = parseFloat(rootStyle.getPropertyValue('--ticket-gap')) || 10;
    metrics.ticketStep = metrics.ticketHeight + metrics.ticketGap;
    metrics.viewportHeight = metrics.ticketHeight * 3 + metrics.ticketGap * 2;
}

function getTicketClass(amount) {
    if (amount >= 100) return 'ticket-gold';
    if (amount >= 5) return 'ticket-blue';
    if (amount >= 1) return 'ticket-teal';
    return 'ticket-green';
}

function formatAmount(amount) {
    const n = parseFloat(amount);
    if (n >= 100) return '100';
    if (n >= 10) return String(n);
    if (Number.isInteger(n)) return String(n);
    return String(n);
}

function buildReel() {
    const track = document.getElementById('reelTrack');
    const fragment = document.createDocumentFragment();
    const total = CYCLE_LEN * REPEAT_COUNT;

    for (let i = 0; i < total; i++) {
        const amount = PRIZES[i % CYCLE_LEN];
        const ticket = document.createElement('div');
        ticket.className = `ticket ${getTicketClass(amount)}`;
        ticket.dataset.amount = String(amount);
        ticket.innerHTML = `
            <div class="ticket-icon" aria-hidden="true"></div>
            <div class="ticket-amount-wrap">
                <span class="ticket-amount">${formatAmount(amount)}</span>
                <span class="ticket-label">Tether</span>
            </div>
        `;
        fragment.appendChild(ticket);
    }

    track.replaceChildren(fragment);
}

function prizeToOffset(amount) {
    const n = parseFloat(amount);
    const idx = PRIZES.findIndex(p => Math.abs(p - n) < 0.001);
    return idx === -1 ? 0 : idx;
}

function indexToPrize(index) {
    const i = ((index % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
    return PRIZES[i];
}

function indexToOffset(index) {
    const centerY = metrics.viewportHeight / 2;
    const ticketCenter = index * metrics.ticketStep + metrics.ticketHeight / 2;
    return ticketCenter - centerY;
}

function setTrackIndex(index, animate, duration = 3600) {
    const track = document.getElementById('reelTrack');
    const clamped = Math.max(0, Math.min(index, CYCLE_LEN * REPEAT_COUNT - 1));
    const offset = indexToOffset(clamped);

    if (animate) {
        track.classList.add('is-animating');
        track.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.8, 0.22, 1)`;
    } else {
        track.classList.remove('is-animating');
        track.style.transition = 'none';
        void track.offsetHeight;
    }

    track.style.transform = `translate3d(0, ${-offset}px, 0)`;
    state.currentIndex = clamped;
}

function snapToPrize(prizeAmount) {
    const prizeOffset = prizeToOffset(prizeAmount);
    const index = MIDDLE_CYCLE * CYCLE_LEN + prizeOffset;
    setTrackIndex(index, false);
    return index;
}

function findTargetIndex(prizeAmount, fromIndex) {
    const prizeOffset = prizeToOffset(prizeAmount);
    const rotations = 4 + Math.floor(Math.random() * 3);
    const currentInCycle = ((fromIndex % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;

    let delta = prizeOffset - currentInCycle;
    if (delta <= 0) delta += CYCLE_LEN;

    let target = fromIndex + rotations * CYCLE_LEN + delta;

    const maxIndex = CYCLE_LEN * REPEAT_COUNT - 1;
    const maxSafe = CYCLE_LEN * (REPEAT_COUNT - 2);
    if (target > maxSafe) {
        fromIndex = MIDDLE_CYCLE * CYCLE_LEN + currentInCycle;
        setTrackIndex(fromIndex, false);
        target = fromIndex + rotations * CYCLE_LEN + delta;
    }

    target = Math.min(target, maxIndex);

    if (Math.abs(indexToPrize(target) - parseFloat(prizeAmount)) > 0.001) {
        target = MIDDLE_CYCLE * CYCLE_LEN + prizeOffset + rotations * CYCLE_LEN;
    }

    return target;
}

function animateToIndex(targetIndex, prizeAmount, duration = 3600) {
    return new Promise(resolve => {
        const track = document.getElementById('reelTrack');
        let finished = false;

        const finish = () => {
            if (finished) return;
            finished = true;
            track.removeEventListener('transitionend', onEnd);
            snapToPrize(prizeAmount);
            resolve();
        };

        const onEnd = (e) => {
            if (e.target !== track || e.propertyName !== 'transform') return;
            finish();
        };

        track.addEventListener('transitionend', onEnd);
        setTrackIndex(targetIndex, true, duration);
        setTimeout(finish, duration + 200);
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
    el.textContent = `${formatBalance(balance)} USDT`;
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

    syncMetrics();

    let spinId;
    let prizeAmount;

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
        prizeAmount = parseFloat(startData.prize_amount);
        state.currentSpinId = spinId;
        state.usdtBalance = startData.usdt_balance;
        updateBalanceUI(state.usdtBalance);

        const fromIndex = state.currentIndex;
        const targetIndex = findTargetIndex(prizeAmount, fromIndex);

        await animateToIndex(targetIndex, prizeAmount, 3600);

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
