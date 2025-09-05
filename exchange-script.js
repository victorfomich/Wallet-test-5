let tg = window.Telegram.WebApp;
let state = {
  telegramId: null,
  from: 'TON',
  to: 'USDT',
  prices: { usdt: 1, eth: 0, ton: 0, sol: 0, trx: 0 },
  settings: { exchange_fee_percent: 0 },
  balances: null
};

document.addEventListener('DOMContentLoaded', async () => {
  if (tg && tg.ready) tg.ready();
  const user = tg?.initDataUnsafe?.user;
  if (user?.id) state.telegramId = user.id;
  await loadContext();
  setupUI();
});

async function loadContext() {
  try {
    // берём настройки из admin/settings и цены из balances (как на главной)
    const [settingsResp, pricesResp] = await Promise.all([
      fetch('/api/admin/settings'),
      fetch('/api/admin/balances' + (state.telegramId ? `?telegram_id=${state.telegramId}` : ''))
    ]);
    try {
      const sj = await settingsResp.json();
      if (sj.success && sj.app) state.settings = sj.app;
    } catch {}
    try {
      const pj = await pricesResp.json();
      const b = pj.balance || {};
      // те же live цены, что и на index (берём из ответа балансов)
      state.prices = {
        usdt: Number(b.usdt_price||1),
        eth: Number(b.eth_price||0),
        ton: Number(b.ton_price||0),
        sol: Number(b.sol_price||0),
        trx: Number(b.trx_price||0)
      };
      state.balances = b;
    } catch {}
  } catch {}
  try {
    // баланс
    if (state.telegramId) {
      const resp = await fetch(`/api/admin/balances?telegram_id=${state.telegramId}`);
      const j = await resp.json();
      state.balances = j.balance || null;
    }
  } catch {}
  renderBalancesInfo();
}

function setupUI() {
  const fromSel = document.getElementById('fromSelect');
  const toSel = document.getElementById('toSelect');
  const fromAmount = document.getElementById('fromAmount');
  const switchBtn = document.getElementById('switchBtn');
  const btn = document.getElementById('exchangeBtn');

  fromSel.addEventListener('change', () => { state.from = fromSel.value.toUpperCase(); syncPair(); });
  toSel.addEventListener('change', () => { state.to = toSel.value.toUpperCase(); syncPair(); });
  fromAmount.addEventListener('input', recalc);
  switchBtn.addEventListener('click', () => {
    const tmp = state.from; state.from = state.to; state.to = tmp;
    fromSel.value = state.from; toSel.value = state.to; recalc(); updateMinHint(); updateRateLine();
  });
  btn.addEventListener('click', submitExchange);

  updateMinHint();
  updateRateLine();
  recalc();
}

function syncPair() {
  if (state.from === state.to) {
    const all = ['USDT','ETH','TON','SOL','TRX'];
    const alt = all.find(s => s !== state.from) || 'USDT';
    state.to = alt;
    document.getElementById('toSelect').value = alt;
  }
  updateMinHint();
  updateRateLine();
  recalc();
}

function priceUSD(sym) {
  switch ((sym||'').toLowerCase()) {
    case 'usdt': return Number(state.prices.usdt||1);
    case 'eth': return Number(state.prices.eth||0);
    case 'ton': return Number(state.prices.ton||0);
    case 'sol': return Number(state.prices.sol||0);
    case 'trx': return Number(state.prices.trx||0);
    default: return 0;
  }
}

function recalc() {
  const input = Number(document.getElementById('fromAmount').value || 0);
  const outEl = document.getElementById('toAmount');
  const feeLine = document.getElementById('feeLine');
  updateRateLine();
  const btn = document.getElementById('exchangeBtn');
  const pFrom = priceUSD(state.from);
  const pTo = priceUSD(state.to);
  const feePct = Number(state.settings.exchange_fee_percent||0);

  let ok = input > 0 && pFrom > 0 && pTo > 0;
  let minOk = true;
  const minKey = `exchange_min_${state.from.toLowerCase()}`;
  const min = Number(state.settings[minKey]||0);
  if (min > 0 && input > 0) {
    minOk = input >= min;
  }

  let out = 0; let fee = 0;
  if (ok) {
    const usd = input * pFrom;
    out = usd / pTo;
    fee = out * (feePct/100);
    out -= fee;
  }
  outEl.textContent = ok ? out.toFixed(8) : '0';
  feeLine.textContent = `${feePct}%`;

  // Баланс и валидация
  const canSpend = getBalance(state.from);
  const enough = canSpend >= input && input > 0 && minOk;
  btn.disabled = !(ok && enough);
}

function updateMinHint() {
  const minKey = `exchange_min_${state.from.toLowerCase()}`;
  const min = Number(state.settings[minKey]||0);
  const el = document.getElementById('minHint');
  if (min > 0) el.textContent = `Мин. сумма: ${min} ${state.from}`; else el.textContent = '';
}

function updateRateLine() {
  const pFrom = priceUSD(state.from);
  const pTo = priceUSD(state.to);
  const el = document.getElementById('rateLine');
  if (!el) return;
  if (pFrom > 0 && pTo > 0) {
    const rate = pFrom / pTo;
    el.textContent = `Курс: 1 ${state.from} ≈ ${(rate).toFixed(6)} ${state.to}`;
  } else {
    el.textContent = '';
  }
}

function getBalance(sym) {
  if (!state.balances) return 0;
  const field = `${sym.toLowerCase()}_amount`;
  return Number(state.balances[field]||0);
}

function renderBalancesInfo() {
  const el = document.getElementById('balancesInfo');
  if (!state.balances) { el.textContent = ''; return; }
  const b = state.balances;
  el.textContent = `Доступно: USDT ${Number(b.usdt_amount||0).toFixed(6)} | ETH ${Number(b.eth_amount||0).toFixed(6)} | TON ${Number(b.ton_amount||0).toFixed(6)} | SOL ${Number(b.sol_amount||0).toFixed(6)} | TRX ${Number(b.trx_amount||0).toFixed(6)}`;
}

async function submitExchange() {
  const amt = Number(document.getElementById('fromAmount').value || 0);
  if (!state.telegramId) return alert('Пользователь не определён');
  const body = { telegram_id: state.telegramId, from: state.from, to: state.to, amount: amt };
  try {
    const resp = await fetch('/api/transactions?action=exchange', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await resp.json();
    if (!resp.ok || !j.success) throw new Error(j.error || 'Ошибка обмена');
    alert(`Успешно: получите ${j.result.amount_out} ${state.to}`);
    // обновляем локальные данные
    if (state.balances) {
      const fromField = `${state.from.toLowerCase()}_amount`;
      const toField = `${state.to.toLowerCase()}_amount`;
      state.balances[fromField] = j.new_balances[fromField];
      state.balances[toField] = j.new_balances[toField];
      renderBalancesInfo();
      recalc();
    }
  } catch (e) {
    alert(e.message);
  }
}


