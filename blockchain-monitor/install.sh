#!/bin/bash
# Установочный скрипт для DreamWallet Blockchain Monitor

echo "🌟 Установка DreamWallet Blockchain Monitor..."

# Проверяем Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не найден. Установите Python 3.8+ и повторите попытку."
    exit 1
fi

echo "✅ Python найден: $(python3 --version)"

# Создаем виртуальное окружение
echo "📦 Создание виртуального окружения..."
python3 -m venv venv

# Активируем виртуальное окружение
echo "🔧 Активация виртуального окружения..."
source venv/bin/activate

# Обновляем pip
echo "⬆️ Обновление pip..."
pip install --upgrade pip

# Устанавливаем зависимости
echo "📚 Установка зависимостей..."
pip install -r requirements.txt

# Делаем скрипт запуска исполняемым
chmod +x run.py

echo ""
echo "✅ Установка завершена!"
echo ""
echo "Для запуска:"
echo "  source venv/bin/activate"
echo "  python run.py --test    # Тест подключения"
echo "  python run.py           # Основной мониторинг"
echo ""
echo "Для запуска в фоне:"
echo "  nohup python run.py > monitor.log 2>&1 &"
echo ""
