#!/usr/bin/env python3
"""
Тестовый запуск мониторинга на 1 цикл для отладки TON проблем
"""

import asyncio
import sys
from pathlib import Path

# Добавляем директорию скрипта в Python PATH
sys.path.insert(0, str(Path(__file__).parent))

from monitor import BlockchainMonitor
from config import logger

async def test_one_cycle():
    """Запуск одного цикла мониторинга для тестирования"""
    logger.info("🧪 ТЕСТОВЫЙ ЗАПУСК - ОДИН ЦИКЛ МОНИТОРИНГА")
    logger.info("🎯 Ищем входящие TON и USDT транзакции...")
    
    try:
        # Создаем и инициализируем монитор
        monitor = BlockchainMonitor()
        await monitor.initialize()
        
        # Запускаем ОДИН цикл мониторинга
        logger.info("🔍 Запускаем один цикл проверки...")
        await monitor.monitor_addresses()
        
        logger.info("✅ Тестовый цикл завершен!")
        
    except Exception as e:
        logger.error(f"❌ Ошибка в тестовом цикле: {e}")
        import traceback
        logger.error(f"Трейсбек: {traceback.format_exc()}")

if __name__ == "__main__":
    print("🚀 Запуск тестового цикла...")
    print("📝 Смотрим что происходит с TON адресами...")
    asyncio.run(test_one_cycle())
