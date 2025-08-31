# 🚀 Создание проекта Supabase для DreamWallet

## Шаг 1: Создание проекта

1. Зайдите на [supabase.com](https://supabase.com) и войдите в аккаунт
2. Нажмите **"New project"**
3. Выберите организацию
4. Заполните данные:
   - **Name**: `DreamWallet`
   - **Database Password**: Создайте надежный пароль (запишите его!)
   - **Region**: Выберите ближайший к пользователям (например, Frankfurt для Европы)
   - **Pricing Plan**: Free (достаточно для начала)
5. Нажмите **"Create new project"**
6. Дождитесь создания проекта (1-2 минуты)

## Шаг 2: Настройка базы данных

1. В панели Supabase перейдите в **SQL Editor**
2. Скопируйте и выполните SQL из файла `supabase-setup-improved.sql`
3. Нажмите **"RUN"** 
4. Убедитесь, что выполнение прошло без ошибок
5. В результате должно появиться сообщение: "Схема базы данных успешно создана! Доступно 20 наборов адресов."

## Шаг 3: Получение ключей API

1. Перейдите в **Settings** → **API**
2. Скопируйте следующие данные:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **anon public** ключ (начинается с `eyJ...`)
   - **service_role** ключ (начинается с `eyJ...`)

## Шаг 4: Вставка ключей в код

Откройте файл `api/supabase.js` и замените:

```javascript
// БЫЛО:
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE';

// СТАЛО (вставьте ваши реальные данные):
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Шаг 5: Проверка данных в базе

1. В Supabase перейдите в **Table Editor**
2. Откройте таблицу `address_sets`
3. Убедитесь, что там есть 20 записей с адресами
4. Все записи должны иметь `is_used = false`

## Шаг 6: Настройка аутентификации (опционально)

1. Перейдите в **Authentication** → **Settings**
2. Отключите **Email confirmations** (для упрощения)
3. В **Site URL** укажите ваш домен Vercel

## Шаг 7: Проверка работы

1. Сохраните изменения в `api/supabase.js`
2. Сделайте коммит и пуш
3. Дождитесь деплоя на Vercel
4. Откройте `/api/debug` - должно показывать все ключи как настроенные
5. Откройте админку - должно показывать 20 доступных адресов

## Настройки безопасности (важно!)

В текущей схеме RLS (Row Level Security) отключен для упрощения. После тестирования рекомендуется:

1. Включить RLS:
```sql
ALTER TABLE address_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

2. Создать политики доступа:
```sql
-- Политика для чтения всех таблиц
CREATE POLICY "Enable read access for all users" ON address_sets FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);

-- Политика для записи только для service_role
CREATE POLICY "Enable write for service role only" ON address_sets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Enable write for service role only" ON users FOR ALL USING (auth.role() = 'service_role');
```

## Решение проблем

### Ошибка "relation does not exist"
- Убедитесь, что SQL скрипт выполнен полностью
- Проверьте, что таблицы созданы в публичной схеме

### Ошибка "insufficient_privilege"  
- Проверьте, что использован service_role ключ
- Убедитесь, что RLS отключен или настроены правильные политики

### Ошибка подключения
- Проверьте правильность URL проекта
- Убедитесь, что ключи скопированы полностью

## Готово! 🎉

После выполнения всех шагов:
- Telegram Mini App должен работать без ошибок
- Админка должна показывать доступные адреса
- Пользователи смогут получать адреса автоматически
