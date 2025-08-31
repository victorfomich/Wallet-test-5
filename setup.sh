#!/bin/bash

echo "🚀 DreamWallet Admin Panel - Быстрая настройка"
echo "=============================================="

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 16+ и попробуйте снова."
    exit 1
fi

echo "✅ Node.js найден: $(node --version)"

# Проверяем наличие npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите npm и попробуйте снова."
    exit 1
fi

echo "✅ npm найден: $(npm --version)"

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден. Создаем пример..."
    cp env.example .env
    echo "📝 Отредактируйте файл .env и добавьте ваши Supabase ключи"
    echo "🔑 Получите ключи на https://supabase.com в разделе Settings > API"
fi

# Проверяем наличие Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Устанавливаем Vercel CLI..."
    npm install -g vercel
else
    echo "✅ Vercel CLI уже установлен: $(vercel --version)"
fi

# Создаем папку для логов
mkdir -p logs

# Создаем пример файла с адресами и ключами
if [ ! -f addresses-with-keys.txt ]; then
    echo "📝 Создаем пример файла с адресами и ключами..."
    cp addresses-with-keys-example.txt addresses-with-keys.txt
    echo "⚠️  ВАЖНО: Отредактируйте addresses-with-keys.txt и добавьте реальные приватные ключи!"
fi

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Отредактируйте файл .env и добавьте ваши Supabase ключи"
echo "2. Выполните SQL скрипт supabase-setup.sql в Supabase SQL Editor"
echo "3. Отредактируйте addresses-with-keys.txt с реальными ключами"
echo "4. Запустите импорт: node import-addresses.js addresses-with-keys.txt"
echo "5. Деплой на Vercel: vercel --prod"
echo "6. Откройте admin.html для управления"
echo ""
echo "🔐 Безопасность:"
echo "- Приватные ключи хранятся в зашифрованном виде"
echo "- Доступ к ключам только у администраторов"
echo "- Пользователи видят только адреса"
echo ""
echo "📚 Подробная документация в README.md"
echo "🆘 При проблемах проверьте логи в папке logs/"
echo ""
echo "⚠️  ВАЖНО: Приватные ключи и сид-фразы должны храниться в безопасном месте!"
