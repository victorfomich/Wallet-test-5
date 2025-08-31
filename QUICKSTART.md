# 🚀 Быстрый старт DreamWallet Admin Panel

## ⚡ 5 минут до запуска

### 1. Автоматическая настройка
```bash
./setup.sh
```

### 2. Настройка Supabase
1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL и ключи из Settings > API
3. Вставьте в файл `.env`

### 3. Настройка базы данных
1. Откройте SQL Editor в Supabase
2. Выполните скрипт `supabase-setup.sql`

### 4. Импорт адресов с ключами
```bash
# Создайте файл addresses-with-keys.txt с вашими адресами и ключами
cp addresses-with-keys-example.txt addresses-with-keys.txt
# Отредактируйте addresses-with-keys.txt (добавьте реальные ключи)
# Запустите импорт
node import-addresses.js addresses-with-keys.txt
```

### 5. Деплой на Vercel
```bash
vercel --prod
```

### 6. Готово! 🎉
- Админ-панель: `admin.html`
- Telegram mini app: `index.html`

## 📱 Как это работает

1. **Новый пользователь** открывает mini app
2. **Система автоматически** создает запись в Supabase
3. **Назначает свободный адрес** из пула
4. **При повторном входе** используются те же адреса
5. **Пользователи НЕ видят приватные ключи** (только адреса)

## 🔑 Типы ключей

| Сеть | Тип | Пример |
|------|-----|---------|
| TON | Приватный ключ | `your_ton_private_key` |
| TRON | Приватный ключ | `your_tron_private_key` |
| Solana | Сид-фраза (12 слов) | `word1 word2 ... word12` |
| ETH | Приватный ключ | `your_eth_private_key` |
| BNB | Сид-фраза (24 слова) | `word1 word2 ... word24` |

## 📤 Формат файла для импорта

```
user1, ton:[address]:[private_key], tron:[address]:[private_key], sol:[address]:[seed_phrase], eth:[address]:[private_key], bnb:[address]:[seed_phrase]
```

## 🔐 Безопасность

- **Приватные ключи** хранятся в зашифрованном виде
- **Доступ к ключам** только у администраторов
- **Пользователи видят только адреса**
- **Row Level Security** включен

## 🔑 Ключевые файлы

- `admin.html` - Админ-панель с управлением ключами
- `script-supabase.js` - Интеграция с Supabase
- `supabase-setup.sql` - Настройка БД с ключами
- `import-addresses.js` - Импорт адресов с ключами

## 🆘 Проблемы?

- Проверьте логи в консоли браузера
- Убедитесь в правильности Supabase ключей
- Проверьте выполнение SQL скрипта
- Убедитесь в правильности формата ключей

---

**Время настройки: ~5 минут** ⏱️

**⚠️ ВАЖНО**: Приватные ключи и сид-фразы должны храниться в безопасном месте!
