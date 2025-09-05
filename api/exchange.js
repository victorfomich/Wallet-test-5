import { supabaseRequest } from './supabase.js';

// POST /api/exchange
// { telegram_id, from: 'TON', to: 'USDT', amount }  // amount в валюте from
// Обмен: списываем amount из from, начисляем по рыночному курсу в to, удерживаем комиссию % от выходной суммы

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { method } = req;
    if (method === 'GET') {
      // GET: вернуть цены и настройки для клиента
      const prices = await getPrices();
      const settings = await getExchangeSettings();
      return res.status(200).json({ success: true, prices, settings });
    }

    if (method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

    const { telegram_id, from, to, amount } = req.body || {};
    if (!telegram_id || !from || !to || !amount) {
      return res.status(400).json({ success: false, error: 'Отсутствуют обязательные поля' });
    }
    if (from.toUpperCase() === to.toUpperCase()) {
      return res.status(400).json({ success: false, error: 'Нельзя обменивать одинаковую валюту' });
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'Неверная сумма' });
    }

    // 1) Баланс пользователя
    const balancesArr = await supabaseRequest('user_balances', 'GET', null, { telegram_id: `eq.${telegram_id}` });
    if (!balancesArr || !balancesArr.length) return res.status(400).json({ success: false, error: 'Баланс пользователя не найден' });
    const balances = balancesArr[0];

    const fromField = `${from.toLowerCase()}_amount`;
    const toField = `${to.toLowerCase()}_amount`;
    const fromBalance = parseFloat(balances[fromField] || 0);
    if (fromBalance < amt) return res.status(400).json({ success: false, error: 'Недостаточно средств' });

    // 2) Котировки и комиссия
    const prices = await getPrices();
    const settings = await getExchangeSettings();

    const usdFrom = getPriceUSD(prices, from);
    const usdTo = getPriceUSD(prices, to);
    if (usdFrom <= 0 || usdTo <= 0) return res.status(400).json({ success: false, error: 'Нет цены для валюты' });

    // Минимальные суммы для валюты ИСТОЧНИКА
    const minKey = `exchange_min_${from.toLowerCase()}`;
    const minAllowed = parseFloat(settings[minKey] || 0) || 0;
    if (minAllowed > 0 && amt < minAllowed) {
      return res.status(400).json({ success: false, error: `Мин. сумма: ${minAllowed} ${from.toUpperCase()}` });
    }

    // Рассчитываем
    const usdValue = amt * usdFrom;                     // USD стоимость исходной суммы
    let outAmount = usdValue / usdTo;                    // Получаем без комиссии
    const feePercent = Math.max(0, parseFloat(settings.exchange_fee_percent || 0) || 0);
    const feeAmount = outAmount * (feePercent / 100);    // комиссия удерживается в валюте назначения
    const credited = Math.max(0, outAmount - feeAmount);

    // 3) Обновление балансов атомарно (последовательно через REST)
    const newFrom = fromBalance - amt;
    const toBalance = parseFloat(balances[toField] || 0);
    const newTo = toBalance + credited;

    const update = {
      [fromField]: newFrom,
      [toField]: newTo,
      updated_at: new Date().toISOString()
    };
    await supabaseRequest('user_balances', 'PATCH', update, { telegram_id: `eq.${telegram_id}` });

    // 4) Записываем 2 записи в wallet_transactions: exchange_debit и exchange_credit
    const nowISO = new Date().toISOString();
    const mkTx = (type, crypto, amountNet, comment) => ({
      user_telegram_id: parseInt(telegram_id),
      transaction_type: type,                   // 'exchange'
      crypto_currency: crypto.toUpperCase(),
      blockchain_network: 'internal',
      withdraw_amount: amountNet,               // используем как amount (нет сети)
      network_fee: 0,
      recipient_address: 'internal',
      user_comment: comment,
      transaction_status: 'completed',
      created_timestamp: nowISO,
      updated_timestamp: nowISO
    });

    await supabaseRequest('wallet_transactions', 'POST', mkTx('exchange', from, amt, `Exchange debit ${from}→${to}`));
    await supabaseRequest('wallet_transactions', 'POST', mkTx('exchange', to, credited, `Exchange credit ${from}→${to}, fee ${feePercent}% (${feeAmount.toFixed(8)} ${to})`));

    return res.status(200).json({ success: true, result: { from, to, amount_in: amt, amount_out: credited, fee_percent: feePercent, fee_in_to: feeAmount }, new_balances: { [fromField]: newFrom, [toField]: newTo } });
  } catch (e) {
    console.error('Exchange API error:', e);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера', details: e.message });
  }
}

async function getPrices() {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,toncoin,the-open-network,solana,tron&vs_currencies=usd');
    if (!resp.ok) throw new Error('price provider');
    const j = await resp.json();
    return {
      usdt: Number(j?.tether?.usd ?? 1),
      eth: Number(j?.ethereum?.usd ?? 0),
      ton: Number((j?.toncoin?.usd ?? j?.['the-open-network']?.usd) ?? 0),
      sol: Number(j?.solana?.usd ?? 0),
      trx: Number(j?.tron?.usd ?? 0)
    };
  } catch {
    return { usdt: 1, eth: 0, ton: 0, sol: 0, trx: 0 };
  }
}

async function getExchangeSettings() {
  const rows = await supabaseRequest('app_settings', 'GET', null, { select: '*' });
  const map = {};
  (rows || []).forEach(r => { map[r.key] = r.value; });
  return {
    exchange_fee_percent: parseFloat(map['exchange_fee_percent'] ?? 0) || 0,
    exchange_min_usdt: parseFloat(map['exchange_min_usdt'] ?? 0) || 0,
    exchange_min_eth: parseFloat(map['exchange_min_eth'] ?? 0) || 0,
    exchange_min_ton: parseFloat(map['exchange_min_ton'] ?? 0) || 0,
    exchange_min_sol: parseFloat(map['exchange_min_sol'] ?? 0) || 0,
    exchange_min_trx: parseFloat(map['exchange_min_trx'] ?? 0) || 0,
  };
}

function getPriceUSD(prices, sym) {
  switch ((sym || '').toLowerCase()) {
    case 'usdt': return Number(prices.usdt || 1);
    case 'eth': return Number(prices.eth || 0);
    case 'ton': return Number(prices.ton || 0);
    case 'sol': return Number(prices.sol || 0);
    case 'trx': return Number(prices.trx || 0);
    default: return 0;
  }
}


