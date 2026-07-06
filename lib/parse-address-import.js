// Парсер строк импорта наборов адресов
// Формат: user1, ton:адрес, tron:адрес, sol:адрес, eth:адрес, bnb:адрес

const NETWORKS = ['ton', 'tron', 'sol', 'eth', 'bnb'];

export function parseAddressImportLine(line) {
    const trimmed = (line || '').trim();
    if (!trimmed) return null;

    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) {
        throw new Error('Недостаточно данных в строке');
    }

    const name = parts[0];
    if (!name) {
        throw new Error('Отсутствует имя набора');
    }

    const addresses = { ton: null, tron: null, sol: null, eth: null, bnb: null };
    const secrets = { ton: null, tron: null, sol: null, eth: null, bnb: null };

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const colonIndex = part.indexOf(':');
        if (colonIndex <= 0) continue;

        const network = part.substring(0, colonIndex).toLowerCase();
        const address = part.substring(colonIndex + 1).trim();

        if (NETWORKS.includes(network) && address) {
            addresses[network] = address;
        }
    }

    const missing = NETWORKS.filter(n => !addresses[n]);
    if (missing.length > 0) {
        throw new Error(`Отсутствуют адреса: ${missing.join(', ').toUpperCase()}`);
    }

    return { name, addresses, secrets };
}

export function parseAddressImportText(text) {
    const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const errors = [];

    lines.forEach((line, index) => {
        try {
            const item = parseAddressImportLine(line);
            if (item) parsed.push({ ...item, line: index + 1 });
        } catch (e) {
            errors.push({ line: index + 1, message: e.message, content: line });
        }
    });

    return { parsed, errors, totalLines: lines.length };
}
