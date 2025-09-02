#!/usr/bin/env python3
"""
DreamWallet Blockchain Monitor
Скрипт для запуска мониторинга блокчейнов
"""

import sys
import os
import asyncio
import argparse
from pathlib import Path

# Добавляем текущую директорию в путь
sys.path.insert(0, str(Path(__file__).parent))

from monitor import main as monitor_main
from config import logger, NETWORKS

def print_banner():
    """Красивый баннер"""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                    DreamWallet Monitor                      ║
║                  Blockchain Monitor v1.0                   ║
╠══════════════════════════════════════════════════════════════╣
║  Поддерживаемые сети:                                       ║
║  • TON (The Open Network)                                   ║
║  • TRON (TRC20 USDT)                                        ║
║  • Solana (SPL USDT)                                        ║
║  • Ethereum (ERC20 USDT)                                    ║
║  • BNB Smart Chain (BEP20 USDT)                             ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def check_requirements():
    """Проверка зависимостей"""
    try:
        import httpx
        import supabase
        logger.info("✅ Все зависимости установлены")
        return True
    except ImportError as e:
        logger.error(f"❌ Отсутствуют зависимости: {e}")
        logger.error("Установите зависимости: pip install -r requirements.txt")
        return False

async def test_connection():
    """Тест подключения к Supabase"""
    try:
        from database import SupabaseClient
        db = SupabaseClient()
        
        # Пробуем получить адреса
        addresses = await db.get_addresses()
        logger.info(f"✅ Подключение к Supabase успешно. Найдено {len(addresses)} наборов адресов")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка подключения к Supabase: {e}")
        return False

def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='DreamWallet Blockchain Monitor')
    parser.add_argument('--test', action='store_true', help='Тест подключения')
    parser.add_argument('--no-banner', action='store_true', help='Скрыть баннер')
    
    args = parser.parse_args()
    
    if not args.no_banner:
        print_banner()
    
    # Проверяем зависимости
    if not check_requirements():
        sys.exit(1)
    
    if args.test:
        # Тест режим
        logger.info("🧪 Режим тестирования...")
        
        async def test():
            success = await test_connection()
            if success:
                logger.info("✅ Все тесты пройдены успешно!")
                return 0
            else:
                logger.error("❌ Тесты не пройдены")
                return 1
        
        result = asyncio.run(test())
        sys.exit(result)
    
    else:
        # Основной режим
        logger.info("🚀 Запуск основного мониторинга...")
        try:
            asyncio.run(monitor_main())
        except KeyboardInterrupt:
            logger.info("👋 Мониторинг остановлен пользователем")
        except Exception as e:
            logger.error(f"💥 Критическая ошибка: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
