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
  // Предзагружаем иконки валют, чтобы при смене не было задержек
  try { preloadCurrencyIcons(); } catch {}
  const user = tg?.initDataUnsafe?.user;
  if (user?.id) state.telegramId = user.id;
  await loadContext();
  setupBackNavigation();
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
  const fromAmount = document.getElementById('fromAmount');
  const switchBtn = document.getElementById('switchBtn');
  const btn = document.getElementById('exchangeBtn');
  const maxBtn = document.querySelector('.max-btn');

  fromAmount.addEventListener('input', recalc);
  switchBtn.addEventListener('click', () => {
    const tmp = state.from; 
    state.from = state.to; 
    state.to = tmp;
    updateCurrencyDisplay();
    updateBalanceDisplay();
    recalc();
  });
  
  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      const balance = getBalance(state.from);
      fromAmount.value = balance;
      recalc();
    });
  }
  
  btn.addEventListener('click', submitExchange);

  // Селекторы валют
  setupCurrencySelectors();

  updateCurrencyDisplay();
  updateBalanceDisplay();
  recalc();
}

function setupBackNavigation() {
  // Показываем кнопку назад Telegram и вешаем обработчик
  try {
    if (tg && tg.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => safeBack());
    }
  } catch {}

  // Страховка для браузерной кнопки «назад» внутри WebView
  try {
    // Если истории нет – при нажатии «назад» отправим на index.html
    window.addEventListener('popstate', () => {
      // Ничего не делаем: системный «назад» вернёт на предыдущую страницу
    });
  } catch {}
}

function safeBack() {
  try {
    if (window.history && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'index.html';
    }
  } catch {
    window.location.href = 'index.html';
  }
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

  // Комиссия: поддерживаем новые и старые ключи
  const feePct = Number(state.settings.fee_percent || state.settings.exchange_fee_percent || 0);

  let ok = input > 0 && pFrom > 0 && pTo > 0;
  let minOk = true;
  // Минимум: поддерживаем новые и старые ключи
  const minKeyNew = `min_${state.from.toLowerCase()}`;
  const minKeyOld = `exchange_min_${state.from.toLowerCase()}`;
  const min = Number(state.settings[minKeyNew] || state.settings[minKeyOld] || 0);
  if (min > 0 && input > 0) {
    minOk = input >= min;
  }

  let out = 0; let fee = 0;
  if (ok) {
    const usd = input * pFrom;
    out = usd / pTo;
    fee = out * (feePct / 100);
    out -= fee;
  }
  if (outEl) outEl.textContent = ok ? out.toFixed(8) : '0';
  if (feeLine) feeLine.textContent = `${feePct}%`;

  // Баланс и валидация
  const canSpend = getBalance(state.from);
  const enough = canSpend >= input && input > 0 && minOk;
  if (btn) btn.disabled = !(ok && enough);
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

function updateCurrencyDisplay() {
  const fromCurrency = document.getElementById('fromCurrency');
  const toCurrency = document.getElementById('toCurrency');
  
  if (fromCurrency) fromCurrency.textContent = state.from;
  if (toCurrency) toCurrency.textContent = state.to;
  
  // Обновляем иконки - ищем по ID для точности
  const fromRow = document.getElementById('fromCurrencySelector');
  const toRow = document.getElementById('toCurrencySelector');
  
  if (fromRow) {
    const fromIcon = fromRow.querySelector('.currency-icon');
    if (fromIcon) updateIconInstant(fromIcon, state.from);
  }
  
  if (toRow) {
    const toIcon = toRow.querySelector('.currency-icon');
    if (toIcon) updateIconInstant(toIcon, state.to);
  }
}

// Сменяем иконку моментально, без наложения, опираясь на предзагрузку
function updateIconInstant(container, currency) {
  container.className = `currency-icon ${currency.toLowerCase()}-icon`;
  const img = container.querySelector('img');
  if (!img) return;
  const newSrc = getCurrencyIcon(currency);
  // если уже установлен, ничего не делаем
  if (img.dataset.current === currency) return;
  img.src = newSrc;
  img.alt = currency;
  img.dataset.current = currency;
}

function preloadCurrencyIcons() {
  const list = ['USDT','ETH','TON','SOL','TRX'];
  list.forEach(sym => {
    const src = getCurrencyIcon(sym);
    const im = new Image();
    im.src = src; // загрузка начнётся и кэширует ресурс
  });
}

function updateBalanceDisplay() {
  const balanceLabel = document.getElementById('fromBalance');
  if (balanceLabel) {
    const balance = getBalance(state.from);
    balanceLabel.textContent = balance.toFixed(8);
  }
}

function getCurrencyIcon(currency) {
  const icons = {
    'USDT': 'usdt.png',
    'ETH': 'ethereum.svg',
    'TON': 'toncoin.png',
    'SOL': 'solana.png',
    'TRX': 'tron.png'
  };
  return icons[currency] || 'usdt.png';
}

function setupCurrencySelectors() {
  const fromSelector = document.getElementById('fromCurrencySelector');
  const toSelector = document.getElementById('toCurrencySelector');
  const modal = document.getElementById('currencyModal');
  const modalContent = modal?.querySelector('.modal-content');
  const closeModal = document.getElementById('closeModal');
  let currentSelecting = null;

  function openModal() {
    if (modal) {
      modal.style.display = 'flex';
      if (modalContent) modalContent.classList.remove('closing');
    }
  }

  function closeModalWithAnimation() {
    if (modalContent) {
      modalContent.classList.add('closing');
      setTimeout(() => {
        if (modal) modal.style.display = 'none';
        if (modalContent) modalContent.classList.remove('closing');
        currentSelecting = null;
      }, 300);
    } else {
      // Fallback if no animation
      if (modal) modal.style.display = 'none';
      currentSelecting = null;
    }
  }

  console.log('Setting up currency selectors:', { fromSelector, toSelector, modal });

  if (fromSelector) {
    fromSelector.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('From selector clicked');
      currentSelecting = 'from';
      openModal();
    });
  }

  if (toSelector) {
    toSelector.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('To selector clicked');
      currentSelecting = 'to';
      openModal();
    });
  }

  if (closeModal) {
    closeModal.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModalWithAnimation();
    });
  }

  // Клик по фону модального окна
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModalWithAnimation();
      }
    });
  }

  // Выбор валюты
  const currencyOptions = document.querySelectorAll('.currency-option');
  console.log('Found currency options:', currencyOptions.length);
  
  currencyOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const currency = option.dataset.currency;
      console.log('Currency selected:', currency, 'for:', currentSelecting);
      
      // СНАЧАЛА ОБРАБАТЫВАЕМ ВЫБОР
      if (currentSelecting === 'from') {
        state.from = currency;
      } else if (currentSelecting === 'to') {
        state.to = currency;
      }
      
      // СРАЗУ ЗАКРЫВАЕМ МОДАЛЬНОЕ ОКНО
      if (modal) {
        modal.style.display = 'none';
        if (modalContent) modalContent.classList.remove('closing');
      }
      currentSelecting = null;

      // Проверяем, чтобы from и to не были одинаковыми
      if (state.from === state.to) {
        const all = ['USDT', 'ETH', 'TON', 'SOL', 'TRX'];
        const alt = all.find(s => s !== state.from) || 'USDT';
        if (currentSelecting === 'from') {
          state.to = alt;
        } else {
          state.from = alt;
        }
      }

      updateCurrencyDisplay();
      updateBalanceDisplay();
      recalc();
    });
  });
}

function renderBalancesInfo() {
  // Убираем блок балансов - они теперь отображаются в самой форме
  const el = document.getElementById('balancesInfo');
  if (el) el.style.display = 'none';
}

async function submitExchange() {
  const amt = Number(document.getElementById('fromAmount').value || 0);
  if (!state.telegramId) return alert('Пользователь не определён');
  if (amt <= 0) return alert('Введите сумму для обмена');
  
  const body = { telegram_id: state.telegramId, from: state.from, to: state.to, amount: amt };
  console.log('Submitting exchange:', body);
  
  try {
    const resp = await fetch('/api/transactions?action=exchange', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    
    const j = await resp.json();
    console.log('Exchange response:', j);
    
    if (!resp.ok || !j.success) {
      throw new Error(j.error || 'Ошибка обмена');
    }
    
    alert(`Успешно обменяно!\nПолучено: ${j.result.amount_out} ${state.to}\nКомиссия: ${j.result.fee_amount || 0} ${state.to}`);
    
    // Обновляем локальные данные
    if (state.balances && j.new_balances) {
      const fromField = `${state.from.toLowerCase()}_amount`;
      const toField = `${state.to.toLowerCase()}_amount`;
      state.balances[fromField] = j.new_balances[fromField];
      state.balances[toField] = j.new_balances[toField];
      updateBalanceDisplay();
      
      // Очищаем поле ввода
      document.getElementById('fromAmount').value = '';
      recalc();
    }
    
  } catch (e) {
    console.error('Exchange error:', e);
    alert(`Ошибка обмена: ${e.message}`);
  }
}


