const API_BASE = window.location.origin;
let p2pMerchants = [];
let p2pSettings = { min_amount_usd: 300 };
let activeTab = 'sell';
let selectedMerchant = null;

function formatPrice(merchant) {
    return `${merchant.price} ${merchant.price_currency}`;
}

function formatLimit(min, max) {
    const minText = `$${min}`;
    if (max == null) return `от ${minText}`;
    return `${minText} — $${max}`;
}

function filterMerchants() {
    return p2pMerchants.filter(m => m.merchant_type === activeTab);
}

function renderMerchants() {
    const listEl = document.getElementById('p2pList');
    const minBanner = document.getElementById('p2pMinBanner');
    if (!listEl) return;

    const globalMin = p2pSettings.min_amount_usd || 300;
    if (minBanner) {
        minBanner.textContent = `Минимальная сумма сделки: $${globalMin}`;
    }

    const items = filterMerchants();
    if (!items.length) {
        listEl.innerHTML = '<div class="p2p-empty">Нет доступных предложений в этой категории</div>';
        return;
    }

    listEl.innerHTML = items.map(m => {
        const completion = m.completion_rate != null ? `${m.completion_rate}%` : null;
        const response = m.response_time || null;
        const meta = [
            `<span>${m.deals_count} сделок</span>`,
            `<span>${formatLimit(m.min_amount, m.max_amount)}</span>`
        ];
        if (completion) meta.push(`<span>${completion} завершено</span>`);
        if (response) meta.push(`<span>~${response}</span>`);

        return `
            <article class="p2p-card" data-id="${m.id}">
                <div class="p2p-card-top">
                    <div class="p2p-card-name">${escapeHtml(m.name)}</div>
                    <div class="p2p-card-price">${formatPrice(m)}</div>
                </div>
                <div class="p2p-card-meta">${meta.join('')}</div>
                <div class="p2p-card-payments">${escapeHtml(m.payment_methods || 'Способы оплаты не указаны')}</div>
            </article>
        `;
    }).join('');

    listEl.querySelectorAll('.p2p-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id, 10);
            openMerchantSheet(p2pMerchants.find(m => m.id === id));
        });
    });
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function openMerchantSheet(merchant) {
    if (!merchant) return;
    selectedMerchant = merchant;

    const typeLabel = merchant.merchant_type === 'buy'
        ? 'Покупка USDT у вас'
        : 'Продажа USDT вам';

    document.getElementById('p2pSheetTitle').textContent = merchant.name;
    document.getElementById('p2pSheetType').textContent = typeLabel;
    document.getElementById('p2pSheetPrice').textContent = formatPrice(merchant);
    document.getElementById('p2pSheetLimits').textContent = formatLimit(merchant.min_amount, merchant.max_amount);
    document.getElementById('p2pSheetDeals').textContent = String(merchant.deals_count);
    document.getElementById('p2pSheetPayments').textContent = merchant.payment_methods || '—';
    document.getElementById('p2pSheetCompletion').textContent = merchant.completion_rate != null
        ? `${merchant.completion_rate}%`
        : '—';
    document.getElementById('p2pSheetResponse').textContent = merchant.response_time || '—';
    document.getElementById('p2pSheetNote').textContent = merchant.note || 'Для начала сделки отправьте команду /p2p в чате с ботом.';
    document.getElementById('p2pOverlay').classList.add('open');
}

function closeMerchantSheet() {
    document.getElementById('p2pOverlay').classList.remove('open');
    selectedMerchant = null;
}

async function loadP2pData() {
    const listEl = document.getElementById('p2pList');
    if (listEl) listEl.innerHTML = '<div class="p2p-loading">Загрузка предложений...</div>';

    try {
        const resp = await fetch(`${API_BASE}/api/transactions?p2p=1`);
        const data = await resp.json();
        if (!resp.ok || !data.success) throw new Error(data.error || 'Ошибка загрузки');

        p2pSettings = data.settings || { min_amount_usd: 300 };
        p2pMerchants = data.merchants || [];
        renderMerchants();
    } catch (e) {
        console.error('P2P load error:', e);
        if (listEl) {
            listEl.innerHTML = '<div class="p2p-empty">Не удалось загрузить список мерчантов</div>';
        }
    }
}

function setupTabs() {
    document.querySelectorAll('.p2p-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            activeTab = tab.dataset.type;
            document.querySelectorAll('.p2p-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMerchants();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    }

    document.getElementById('backBtn')?.addEventListener('click', () => {
        window.location.replace('index.html');
    });

    document.getElementById('p2pSheetClose')?.addEventListener('click', closeMerchantSheet);
    document.getElementById('p2pOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'p2pOverlay') closeMerchantSheet();
    });

    document.getElementById('p2pStartDealBtn')?.addEventListener('click', () => {
        const text = selectedMerchant
            ? `P2P: ${selectedMerchant.name}, ${formatPrice(selectedMerchant)}, от $${selectedMerchant.min_amount}`
            : 'P2P сделка';
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(text)}`);
        } else {
            closeMerchantSheet();
        }
    });

    setupTabs();
    loadP2pData();
});
