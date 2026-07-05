// Общий модуль получения live-цен криптовалют (CoinGecko + fallback Binance)

let __CACHE = { ts: 0, data: null };
const CACHE_TTL_MS = 60_000;

const COINGECKO_IDS = ['tether', 'ethereum', 'solana', 'tron', 'the-open-network'];

function normalizePrices(raw) {
  if (!raw) return null;
  return {
    usdt: Number(raw.usdt ?? 1),
    usdt_change: Number(raw.usdt_change ?? 0),
    eth: Number(raw.eth ?? 0),
    eth_change: Number(raw.eth_change ?? 0),
    ton: Number(raw.ton ?? 0),
    ton_change: Number(raw.ton_change ?? 0),
    sol: Number(raw.sol ?? 0),
    sol_change: Number(raw.sol_change ?? 0),
    trx: Number(raw.trx ?? 0),
    trx_change: Number(raw.trx_change ?? 0),
  };
}

async function fetchFromCoinGecko() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const resp = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'DreamWallet/2.0' },
  });
  if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
  const j = await resp.json();
  return normalizePrices({
    usdt: j?.tether?.usd,
    usdt_change: j?.tether?.usd_24h_change,
    eth: j?.ethereum?.usd,
    eth_change: j?.ethereum?.usd_24h_change,
    ton: j?.['the-open-network']?.usd ?? j?.toncoin?.usd,
    ton_change: j?.['the-open-network']?.usd_24h_change ?? j?.toncoin?.usd_24h_change,
    sol: j?.solana?.usd,
    sol_change: j?.solana?.usd_24h_change,
    trx: j?.tron?.usd,
    trx_change: j?.tron?.usd_24h_change,
  });
}

async function fetchFromBinance() {
  const symbols = ['ETHUSDT', 'SOLUSDT', 'TRXUSDT', 'TONUSDT'];
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const resp = await fetch(url, { headers: { accept: 'application/json' } });
  if (!resp.ok) throw new Error(`Binance ${resp.status}`);
  const rows = await resp.json();
  const map = {};
  for (const row of rows) map[row.symbol] = row;

  return normalizePrices({
    usdt: 1,
    usdt_change: 0,
    eth: Number(map.ETHUSDT?.lastPrice ?? 0),
    eth_change: Number(map.ETHUSDT?.priceChangePercent ?? 0),
    sol: Number(map.SOLUSDT?.lastPrice ?? 0),
    sol_change: Number(map.SOLUSDT?.priceChangePercent ?? 0),
    trx: Number(map.TRXUSDT?.lastPrice ?? 0),
    trx_change: Number(map.TRXUSDT?.priceChangePercent ?? 0),
    ton: Number(map.TONUSDT?.lastPrice ?? 0),
    ton_change: Number(map.TONUSDT?.priceChangePercent ?? 0),
  });
}

export function applyLivePricesToBalance(balance, prices) {
  if (!balance || !prices) return balance;
  const view = { ...balance };
  view.usdt_price = prices.usdt;
  view.usdt_change_percent = prices.usdt_change;
  view.eth_price = prices.eth;
  view.eth_change_percent = prices.eth_change;
  view.ton_price = prices.ton;
  view.ton_change_percent = prices.ton_change;
  view.sol_price = prices.sol;
  view.sol_change_percent = prices.sol_change;
  view.trx_price = prices.trx;
  view.trx_change_percent = prices.trx_change ?? 0;
  view.total_usd_balance =
    (Number(view.usdt_amount || 0) * prices.usdt) +
    (Number(view.eth_amount || 0) * prices.eth) +
    (Number(view.ton_amount || 0) * prices.ton) +
    (Number(view.sol_amount || 0) * prices.sol) +
    (Number(view.trx_amount || 0) * prices.trx);
  return view;
}

export async function getLivePrices({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && __CACHE.data && (now - __CACHE.ts) < CACHE_TTL_MS) {
    return __CACHE.data;
  }

  let prices = null;
  try {
    prices = await fetchFromCoinGecko();
  } catch (e) {
    console.warn('CoinGecko prices failed:', e.message);
  }

  if (!prices || !prices.eth) {
    try {
      prices = await fetchFromBinance();
    } catch (e) {
      console.warn('Binance prices failed:', e.message);
    }
  }

  if (prices) {
    __CACHE = { ts: now, data: prices };
    return prices;
  }

  return __CACHE.data;
}
