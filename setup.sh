#!/bin/bash

# Скрипт настройки DreamWallet v2

echo "🚀 Настройка DreamWallet v2"
echo "============================="

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js версии 18 или выше."
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Требуется Node.js версии 18 или выше. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js найден: $(node -v)"

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
npm install

# Проверяем наличие Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Установка Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI найден: $(vercel --version)"

# Создаем файл .env если он не существует
if [ ! -f ".env" ]; then
    echo "📝 Создание файла .env..."
    cp env.example .env
    echo "⚠️  Не забудьте заполнить переменные окружения в файле .env"
else
    echo "✅ Файл .env уже существует"
fi

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Заполните переменные окружения в файле .env"
echo "2. Создайте проект в Supabase и выполните SQL из supabase-setup.sql"
echo "3. Запустите разработческий сервер: npm run dev"
echo "4. Или разверните в продакшн: npm run deploy"
echo ""
echo "📖 Дополнительная информация:"
echo "- Админка доступна по адресу: /admin.html"
echo "- API endpoint'ы: /api/*"
echo "- Основное приложение: /index.html"
echo ""
echo "✨ Удачной разработки!"
