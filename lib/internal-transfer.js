// Внутренние переводы между кошельками DreamWallet
import { supabaseRequest } from './supabase.js';

const NETWORK_ADDRESS_FIELD = {
    ton: 'ton_address',
    tron: 'tron_address',
    sol: 'sol_address',
    eth: 'eth_address',
    bnb: 'bnb_address'
};

function normalizeAddress(network, address) {
    const value = (address || '').trim();
    const net = (network || '').toLowerCase();
    if (net === 'eth' || net === 'bnb') {
        return value.toLowerCase();
    }
    return value;
}

async function findAddressSetByAddress(network, address) {
    const field = NETWORK_ADDRESS_FIELD[network.toLowerCase()];
    if (!field || !address) return null;

    const trimmed = address.trim();
    let sets = await supabaseRequest('address_sets', 'GET', null, {
        [field]: `eq.${trimmed}`
    });

    if ((!sets || sets.length === 0) && (network === 'eth' || network === 'bnb')) {
        sets = await supabaseRequest('address_sets', 'GET', null, {
            [field]: `ilike.${trimmed}`
        });
    }

    if (!sets || sets.length === 0) return null;
    return sets[0];
}

async function resolveRecipientTelegramId(addressSet) {
    if (!addressSet) return null;

    if (addressSet.assigned_to_telegram_id) {
        return addressSet.assigned_to_telegram_id;
    }

    const users = await supabaseRequest('users', 'GET', null, {
        address_set_id: `eq.${addressSet.id}`,
        limit: '1'
    });

    return users?.[0]?.telegram_id || null;
}

async function ensureUserBalance(telegramId) {
    const balances = await supabaseRequest('user_balances', 'GET', null, {
        telegram_id: `eq.${telegramId}`
    });

    if (balances && balances.length > 0) {
        return balances[0];
    }

    const created = await supabaseRequest('user_balances', 'POST', {
        telegram_id: telegramId,
        usdt_amount: 0,
        eth_amount: 0,
        ton_amount: 0,
        sol_amount: 0,
        trx_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    return created[0];
}

/**
 * Если адрес получателя принадлежит другому пользователю — зачисляем средства и создаём deposit.
 */
export async function processInternalTransfer({
    senderTelegramId,
    recipientAddress,
    network,
    crypto,
    amount,
    withdrawTransactionId,
    senderComment = null
}) {
    const net = (network || '').toLowerCase();
    const normalizedRecipient = normalizeAddress(net, recipientAddress);

    const addressSet = await findAddressSetByAddress(net, normalizedRecipient);
    if (!addressSet) {
        return { processed: false, reason: 'address_not_in_wallet' };
    }

    const recipientTelegramId = await resolveRecipientTelegramId(addressSet);
    if (!recipientTelegramId) {
        return { processed: false, reason: 'no_user_for_address' };
    }

    if (String(recipientTelegramId) === String(senderTelegramId)) {
        return { processed: false, reason: 'self_transfer' };
    }

    const creditAmount = parseFloat(amount);
    if (!creditAmount || creditAmount <= 0) {
        return { processed: false, reason: 'invalid_amount' };
    }

    const cryptoKey = (crypto || '').toLowerCase();
    const balanceField = `${cryptoKey}_amount`;
    const balance = await ensureUserBalance(recipientTelegramId);
    const currentBalance = parseFloat(balance[balanceField] || 0);
    const newBalance = currentBalance + creditAmount;

    await supabaseRequest('user_balances', 'PATCH', {
        [balanceField]: newBalance,
        updated_at: new Date().toISOString()
    }, {
        telegram_id: `eq.${recipientTelegramId}`
    });

    const now = new Date().toISOString();
    const depositComment = 'Ваш кошелёк пополнен';

    const depositTx = await supabaseRequest('wallet_transactions', 'POST', {
        user_telegram_id: parseInt(recipientTelegramId),
        transaction_type: 'deposit',
        crypto_currency: crypto.toUpperCase(),
        blockchain_network: net,
        withdraw_amount: creditAmount,
        network_fee: 0,
        recipient_address: normalizedRecipient,
        user_comment: depositComment,
        transaction_status: 'completed',
        created_timestamp: now,
        updated_timestamp: now
    });

    if (withdrawTransactionId) {
        const withdrawNote = senderComment
            ? `${senderComment} (внутренний перевод)`
            : 'Внутренний перевод';

        await supabaseRequest('wallet_transactions', 'PATCH', {
            transaction_status: 'completed',
            user_comment: withdrawNote,
            updated_timestamp: now
        }, {
            id: `eq.${withdrawTransactionId}`
        });
    }

    console.log(`✅ ВНУТРЕННИЙ ПЕРЕВОД: ${creditAmount} ${crypto} от ${senderTelegramId} -> ${recipientTelegramId}`);

    return {
        processed: true,
        recipient_telegram_id: recipientTelegramId,
        credited_amount: creditAmount,
        recipient_new_balance: newBalance,
        deposit_transaction_id: depositTx?.[0]?.id || null
    };
}
