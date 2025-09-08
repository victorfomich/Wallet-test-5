import crypto from 'crypto';

function b64urlEncode(buffer) {
    return Buffer.from(buffer).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4;
    if (pad) str += '='.repeat(4 - pad);
    return Buffer.from(str, 'base64').toString('utf8');
}

function sign(data, secret) {
    return b64urlEncode(crypto.createHmac('sha256', secret).update(data).digest());
}

function makeToken(secret, maxAgeSec = 3600) {
    const now = Math.floor(Date.now() / 1000);
    const payload = { iat: now, exp: now + maxAgeSec };
    const payloadStr = JSON.stringify(payload);
    const payloadB64 = b64urlEncode(payloadStr);
    const signature = sign(payloadB64, secret);
    return `${payloadB64}.${signature}`;
}

function verifyToken(token, secret) {
    if (!token || token.indexOf('.') === -1) return { valid: false };
    const [payloadB64, signature] = token.split('.');
    const expected = sign(payloadB64, secret);
    if (expected !== signature) return { valid: false };
    try {
        const payload = JSON.parse(b64urlDecode(payloadB64));
        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp < now) return { valid: false };
        return { valid: true, payload };
    } catch {
        return { valid: false };
    }
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADM_PASS || process.env.DW_ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) {
        return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured' });
    }

    const cookieName = 'dw_admin_token';
    const cookieOptions = 'HttpOnly; Path=/; SameSite=Lax; Max-Age=3600';
    const cookieSecure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';

    if (req.method === 'GET') {
        const cookieHeader = req.headers.cookie || '';
        const token = (cookieHeader.split('; ').find(c => c.startsWith(cookieName + '=')) || '').split('=')[1];
        const check = verifyToken(token, ADMIN_PASSWORD);
        return res.status(200).json({ authenticated: !!check.valid, expiresAt: check.payload?.exp || null });
    }

    if (req.method === 'POST') {
        try {
            const { password, action } = req.body || {};
            if (action === 'logout') {
                res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${cookieSecure}`);
                return res.status(200).json({ success: true });
            }
            if (!password || password !== ADMIN_PASSWORD) {
                return res.status(401).json({ success: false, error: 'Неверный пароль' });
            }
            const token = makeToken(ADMIN_PASSWORD, 3600);
            res.setHeader('Set-Cookie', `${cookieName}=${token}; ${cookieOptions}${cookieSecure}`);
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Некорректный запрос' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}


