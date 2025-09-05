// УДАЛЕНО: объединено в /api/admin/settings для экономии слотов функций
export default function handler(req, res) {
  res.status(410).json({
    success: false,
    error: 'Этот эндпоинт объединен. Используйте /api/admin/settings для чтения и сохранения exchange_* настроек.'
  });
}


