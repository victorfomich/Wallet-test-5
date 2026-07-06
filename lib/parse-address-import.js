// Парсер строк импорта наборов адресов
// Формат: user1, ton:[address]:[secret], tron:[address]:[secret], ...

const NETWORKS = ['ton', 'tron', 'sol', 'eth', 'bnb'];

export function parseAddressImportLine(line) {
    const trimmed = (line || '').trim();
    if (!trimmed) return null;

    const nameMatch = trimmed.match(/^([^,]+),\s*/);
    if (!nameMatch) {
        throw new Error('Отсутствует имя набора (ожидается: user1, ton:[...]:[...], ...)');
    }

    const name = nameMatch[1].trim();
    if (!name) {
        throw new Error('Пустое имя набора');
    }

    const addresses = { ton: null, tron: null, sol: null, eth: null, bnb: null };
    const secrets = { ton: null, tron: null, sol: null, eth: null, bnb: null };

    const bracketPattern = /(ton|tron|sol|eth|bnb):\[([^\]]+)\]:\[([^\]]+)\]/gi;
    let match;
    let foundBracket = false;

    while ((match = bracketPattern.exec(trimmed)) !== null) {
        foundBracket = true;
        const network = match[1].toLowerCase();
        addresses[network] = match[2].trim();
        secrets[network] = match[3].trim();
    }

    if (foundBracket) {
        const missing = NETWORKS.filter(n => !addresses[n] || !secrets[n]);
        if (missing.length > 0) {
            throw new Error(`Не заполнены сети: ${missing.join(', ').toUpperCase()}`);
        }
        return { name, addresses, secrets };
    }

    return parseLegacyImportLine(trimmed, name);
}

function parseLegacyImportLine(trimmed, name) {
    const addresses = { ton: null, tron: null, sol: null, eth: null, bnb: null };
    const secrets = { ton: null, tron: null, sol: null, eth: null, bnb: null };

    const rest = trimmed.slice(trimmed.indexOf(',') + 1);
    const parts = rest.split(',').map(p => p.trim()).filter(Boolean);

    for (const part of parts) {
        const colonIndex = part.indexOf(':');
        if (colonIndex <= 0) continue;
        const network = part.substring(0, colonIndex).toLowerCase();
        const value = part.substring(colonIndex + 1).trim();
        if (NETWORKS.includes(network) && value) {
            addresses[network] = value;
        }
    }

    const hasAny = NETWORKS.some(n => addresses[n]);
    if (!hasAny) {
        throw new Error('Не найдено ни одного адреса. Используйте формат ton:[адрес]:[секрет]');
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
