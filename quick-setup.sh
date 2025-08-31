#!/bin/bash

# Быстрая настройка DreamWallet с встроенными ключами

echo "🚀 Быстрая настройка DreamWallet"
echo "================================"

# Проверяем наличие необходимых файлов
if [ ! -f "api/supabase.js" ]; then
    echo "❌ Файл api/supabase.js не найден!"
    exit 1
fi

if [ ! -f "supabase-setup-improved.sql" ]; then
    echo "❌ Файл supabase-setup-improved.sql не найден!"
    exit 1
fi

echo ""
echo "Инструкция по настройке:"
echo "========================"
echo ""
echo "1. 🔗 Создайте проект в Supabase:"
echo "   - Зайдите на https://supabase.com"
echo "   - Создайте новый проект 'DreamWallet'"
echo "   - Дождитесь готовности проекта"
echo ""
echo "2. 🗄️ Настройте базу данных:"
echo "   - Откройте SQL Editor в Supabase"
echo "   - Скопируйте содержимое файла 'supabase-setup-improved.sql'"
echo "   - Выполните скрипт (нажмите RUN)"
echo ""
echo "3. 🔑 Получите ключи API:"
echo "   - Settings → API в панели Supabase"
echo "   - Скопируйте Project URL"
echo "   - Скопируйте anon/public key"
echo "   - Скопируйте service_role key"
echo ""

read -p "📝 Введите Project URL (https://...supabase.co): " PROJECT_URL
read -p "🔐 Введите anon key (eyJ...): " ANON_KEY
read -p "🔐 Введите service_role key (eyJ...): " SERVICE_KEY

if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
    echo "❌ Все поля обязательны для заполнения!"
    exit 1
fi

echo ""
echo "✏️  Обновляем файл api/supabase.js..."

# Создаем backup
cp api/supabase.js api/supabase.js.backup

# Заменяем ключи в файле
sed -i.tmp "s|https://YOUR_PROJECT_ID.supabase.co|$PROJECT_URL|g" api/supabase.js
sed -i.tmp "s|YOUR_ANON_KEY_HERE|$ANON_KEY|g" api/supabase.js
sed -i.tmp "s|YOUR_SERVICE_KEY_HERE|$SERVICE_KEY|g" api/supabase.js

# Удаляем временный файл
rm api/supabase.js.tmp

echo "✅ Ключи успешно встроены в код!"
echo ""
echo "🚀 Следующие шаги:"
echo "=================="
echo "1. Сделайте коммит: git add . && git commit -m 'Configure Supabase keys'"
echo "2. Отправьте в репозиторий: git push"
echo "3. Дождитесь деплоя на Vercel"
echo "4. Проверьте работу: откройте /api/debug"
echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📊 Для проверки статуса выполните:"
echo "curl https://ваш-домен.vercel.app/api/debug"
