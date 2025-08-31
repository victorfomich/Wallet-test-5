# 🚨 РЕШЕНИЕ ПРОБЛЕМЫ "Ошибка загрузки данных пользователя"

## Диагностика проблемы

Главная причина ошибки: **не настроены переменные окружения Supabase в Vercel**.

### Как проверить

1. Откройте ваше приложение в браузере
2. Если видите ошибку "Ошибка загрузки данных пользователя", нажмите кнопку "Диагностика"
3. Или откройте `/api/debug` в браузере для подробной информации

## Пошаговое решение

### Шаг 1: Получите данные от Supabase

1. Зайдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в Settings → API
4. Скопируйте:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **anon/public key** (например: `eyJ...`)
   - **service_role key** (например: `eyJ...`)

### Шаг 2: Настройте переменные в Vercel

1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите проект DreamWallet-v2
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте следующие переменные:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | Ваш Project URL | All Environments |
| `SUPABASE_ANON_KEY` | Ваш anon key | All Environments |
| `SUPABASE_SERVICE_KEY` | Ваш service_role key | All Environments |

### Шаг 3: Редеплойте проект

1. В Vercel перейдите на вкладку **Deployments**
2. Нажмите **Redeploy** на последнем деплойменте
3. Или сделайте новый коммит в репозиторий

### Шаг 4: Проверьте результат

1. Подождите завершения деплоя (1-2 минуты)
2. Откройте ваше приложение
3. Если проблема решена, вы увидите список адресов в админке
4. Telegram mini app должен работать без ошибок

## Дополнительная диагностика

### Проверка API
Откройте в браузере: `https://ваш-домен.vercel.app/api/debug`

Должны увидеть:
```json
{
  "success": true,
  "variables": {
    "SUPABASE_URL": { "exists": true, "value": "Настроен" },
    "SUPABASE_ANON_KEY": { "exists": true, "value": "Настроен" },
    "SUPABASE_SERVICE_KEY": { "exists": true, "value": "Настроен" }
  },
  "connection_test": { "success": true }
}
```

### Проверка базы данных
Убедитесь, что в Supabase выполнен SQL скрипт из `supabase-setup.sql`

### Проверка RLS политик
В Supabase SQL Editor выполните:
```sql
SELECT * FROM address_sets LIMIT 5;
```

Если получаете ошибку доступа, проверьте RLS политики.

## Типичные проблемы и решения

| Проблема | Решение |
|----------|---------|
| "Переменные не настроены" | Добавьте переменные в Vercel и редеплойте |
| "401 Unauthorized" | Проверьте правильность ключей API |
| "404 Not Found" | Проверьте правильность URL проекта |
| "Table doesn't exist" | Выполните SQL скрипт настройки |
| "RLS policy violation" | Проверьте политики доступа в Supabase |

## Контакты для поддержки

Если проблема не решается:
1. Проверьте консоль браузера (F12)
2. Посмотрите логи в Vercel Dashboard
3. Проверьте логи в Supabase Dashboard
