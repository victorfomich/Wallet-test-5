# Настройка Admin Panel для DreamWallet

## Проблема
Админ панель показывает "Ошибка загрузки данных" из-за отсутствия конфигурации Supabase.

## Решение

### 1. Создайте файл .env в корневой папке проекта:

```bash
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Где взять эти значения:

1. Перейдите в ваш проект Supabase (https://supabase.com)
2. Откройте Settings > API
3. Скопируйте:
   - **URL**: Project URL
   - **ANON KEY**: anon public key  
   - **SERVICE_ROLE_KEY**: service_role secret key (⚠️ Будьте осторожны!)

### 3. Пример правильного .env файла:

```bash
SUPABASE_URL=https://xyzabcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Настройка базы данных:

1. Убедитесь, что в Supabase выполнен SQL из файла `supabase-setup.sql`
2. Проверьте, что таблицы `users` и `address_pool` созданы
3. Убедитесь, что есть тестовые данные в таблице `address_pool`

### 5. Проверка работы:

1. Сохраните .env файл
2. Перезапустите сервер разработки (если используете `vercel dev`)
3. Откройте admin.html
4. Вы должны увидеть загруженные данные вместо ошибки

## Исправленные проблемы:

✅ Добавлена колонка "Тип ключа" в таблицу адресов
✅ Исправлен расчет доступных адресов в статистике  
✅ Добавлен параметр `admin=true` для загрузки полных данных адресов
✅ Улучшена обработка ошибок с более понятными сообщениями
✅ Добавлены логи для диагностики проблем с переменными окружения

## Безопасность:

⚠️ **Важно**: Никогда не коммитьте .env файл в git!
⚠️ Service Role Key дает полный доступ к базе данных
⚠️ Используйте Service Role Key только на сервере, никогда в клиентском коде

## Если проблемы остаются:

1. Проверьте консоль браузера (F12) на наличие ошибок
2. Проверьте логи Vercel или вашего хостинга
3. Убедитесь, что Supabase проект активен и доступен
