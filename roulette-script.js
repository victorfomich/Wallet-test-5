const PRIZES = [0.1, 0.5, 0.8, 1, 2, 5, 10, 100];
const SPIN_COST = 1;
const REPEAT_COUNT = 12;
const CYCLE_LEN = PRIZES.length;

let tg = window.Telegram?.WebApp;
let state = {
    telegramId: null,
    usdtBalance: 0,
    isSpinning: false,
    currentSpinId: null,
    currentIndex: 0
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
    state.currentIndex = getMiddleIndex();
    setTrackIndex(state.currentIndex, false);
    await loadBalance();
});

function setupUI() {
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('spinBtn').addEventListener('click', handleSpin);
    window.addEventListener('resize', () => {
        syncMetrics();
        setTrackIndex(state.currentIndex, false);
    });
}

function waitForLayout() {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

function syncMetrics() {
    const viewport = document.querySelector('.reel-viewport');
    const ticket = document.querySelector('#reelTrack .ticket');
    if (!viewport || !ticket) return;

    const ticketRect = ticket.getBoundingClientRect();
    const ticketStyle = getComputedStyle(ticket);
    const marginBottom = parseFloat(ticketStyle.marginBottom) || 0;

    metrics.ticketHeight = ticketRect.height || 88;
    metrics.ticketGap = marginBottom;
    metrics.ticketStep = metrics.ticketHeight + metrics.ticketGap;
    metrics.viewportHeight = viewport.getBoundingClientRect().height || 284;
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

function getMiddleIndex() {
    return Math.floor(REPEAT_COUNT / 2) * CYCLE_LEN;
}

function indexToOffset(index) {
    const centerY = metrics.viewportHeight / 2;
    const ticketCenter = index * metrics.ticketStep + metrics.ticketHeight / 2;
    return ticketCenter - centerY;
}

function setTrackIndex(index, animate, duration = 3800) {
    const track = document.getElementById('reelTrack');
    const offset = indexToOffset(index);

    if (animate) {
        track.classList.add('is-animating');
        track.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.8, 0.22, 1)`;
    } else {
        track.classList.remove('is-animating');
        track.style.transition = 'none';
    }

    track.style.transform = `translate3d(0, ${-offset}px, 0)`;
    state.currentIndex = index;
}

function getOffsetFromTransform() {
    const track = document.getElementById('reelTrack');
    const transform = track.style.transform || '';
    const match = transform.match(/translate3d\([^,]+,\s*(-?\d+\.?\d*)px/);
    if (!match) return indexToOffset(state.currentIndex);
    const offset = Math.abs(parseFloat(match[1]));
    const centerY = metrics.viewportHeight / 2;
    const ticketCenter = offset + centerY;
    return Math.round((ticketCenter - metrics.ticketHeight / 2) / metrics.ticketStep);
}

function normalizeIndex(index) {
    const prizeInCycle = ((index % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
    const middleCycle = Math.floor(REPEAT_COUNT / 2);
    return middleCycle * CYCLE_LEN + prizeInCycle;
}

function ensureSafeIndex(index) {
    const minSafe = CYCLE_LEN * 2;
    const maxSafe = CYCLE_LEN * (REPEAT_COUNT - 2);
    if (index < minSafe || index > maxSafe) {
        return normalizeIndex(index);
    }
    return index;
}

function prizeToIndex(amount) {
    const n = parseFloat(amount);
    return PRIZES.findIndex(p => Math.abs(p - n) < 0.001);
}

function findTargetIndex(prizeAmount, fromIndex) {
    const prizeOffset = prizeToIndex(prizeAmount);
    if (prizeOffset === -1) return fromIndex + CYCLE_LEN * 6;

    const safeFrom = ensureSafeIndex(fromIndex);
    if (safeFrom !== fromIndex) {
        setTrackIndex(safeFrom, false);
        fromIndex = safeFrom;
    }

    const rotations = 5 + Math.floor(Math.random() * 3);
    const currentInCycle = ((fromIndex % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN;
    let delta = prizeOffset - currentInCycle;
    if (delta <= 0) delta += CYCLE_LEN;

    const target = fromIndex + rotations * CYCLE_LEN + delta;
    const maxIndex = CYCLE_LEN * REPEAT_COUNT - 1;
    return Math.min(target, maxIndex - CYCLE_LEN);
}

function animateToIndex(targetIndex, duration = 3800) {
    return new Promise(resolve => {
        const track = document.getElementById('reelTrack');

        const onEnd = (e) => {
            if (e.propertyName !== 'transform') return;
            track.removeEventListener('transitionend', onEnd);
            track.classList.remove('is-animating');
            track.style.transition = 'none';

            const normalized = normalizeIndex(targetIndex);
            if (normalized !== targetIndex) {
                setTrackIndex(normalized, false);
            } else {
                state.currentIndex = targetIndex;
            }
            resolve();
        };

        track.addEventListener('transitionend', onEnd);
        setTrackIndex(targetIndex, true, duration);

        setTimeout(() => {
            track.removeEventListener('transitionend', onEnd);
            track.classList.remove('is-animating');
            track.style.transition = 'none';
            const normalized = normalizeIndex(targetIndex);
            setTrackIndex(normalized, false);
            resolve();
        }, duration + 120);
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
        prizeAmount = startData.prize_amount;
        state.currentSpinId = spinId;
        state.usdtBalance = startData.usdt_balance;
        updateBalanceUI(state.usdtBalance);

        const currentIndex = ensureSafeIndex(getOffsetFromTransform());
        setTrackIndex(currentIndex, false);
        const targetIndex = findTargetIndex(prizeAmount, currentIndex);

        await animateToIndex(targetIndex, 3600);

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
