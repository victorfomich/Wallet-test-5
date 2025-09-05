// API для сброса адресов пользователя
import { supabaseRequest } from '../../lib/supabase.js';

// УДАЛЕНО: функционал объединён в /api/admin/users/[userId] (POST ?action=reset)
export default function handler(req, res) {
    res.status(410).json({ success: false, error: 'Endpoint deprecated. Use /api/admin/users/[userId]?action=reset' });
}
