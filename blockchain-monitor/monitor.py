# Main blockchain monitor
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Set
from database import SupabaseClient
from blockchain_clients import create_blockchain_client
from config import NETWORKS, CHECK_INTERVAL, MIN_AMOUNT, logger

class BlockchainMonitor:
    """Основной класс для мониторинга блокчейнов"""
    
    def __init__(self):
        self.db = SupabaseClient()
        self.clients = {}
        self.processed_txs: Set[str] = set()
        self.last_balances: Dict[str, float] = {}
        
        # Инициализируем клиенты для всех сетей
        for network in NETWORKS.keys():
            client = create_blockchain_client(network)
            if client:
                self.clients[network] = client
                logger.info(f"✅ Клиент для {network.upper()} инициализирован")
            else:
                logger.error(f"❌ Не удалось создать клиент для {network.upper()}")
    
    async def initialize(self):
        """Инициализация монитора"""
        logger.info("🚀 Инициализация BlockchainMonitor...")
        
        # Загружаем обработанные транзакции
        processed = await self.db.get_processed_transactions()
        self.processed_txs.update(processed)
        logger.info(f"📝 Загружено {len(processed)} обработанных транзакций")
        
        logger.info("✅ BlockchainMonitor инициализирован")
    
    async def check_address_balance(self, address: str, network: str, user_telegram_id: int) -> bool:
        """Проверить баланс конкретного адреса"""
        if network not in self.clients:
            return False
        
        client = self.clients[network]
        network_config = NETWORKS[network]
        
        try:
            # Проверяем нативный токен (TON, TRX, SOL, ETH, BNB)
            native_balance = await client.get_balance(address)
            balance_key = f"{address}_{network}_native"
            
            if native_balance > MIN_AMOUNT:
                last_balance = self.last_balances.get(balance_key, 0)
                
                if native_balance > last_balance:
                    # Баланс увеличился - засчитываем как депозит
                    deposit_amount = native_balance - last_balance
                    logger.info(f"💰 Новый депозит: +{deposit_amount} {network_config['native_token']} на {address[:8]}...")
                    
                    # Обновляем баланс пользователя
                    currency = network_config['native_token'].lower()
                    if currency == 'trx':
                        currency = 'trx'  # Приводим к стандартному названию
                    
                    await self.db.update_balance(user_telegram_id, currency, deposit_amount)
                    
                    # Записываем депозит
                    await self.db.record_deposit(
                        user_telegram_id, network, currency.upper(), 
                        deposit_amount, f"balance_check_{int(time.time())}", address
                    )
                
                self.last_balances[balance_key] = native_balance
            
            # Проверяем USDT если есть контракт
            usdt_contract = network_config.get('usdt_contract')
            if usdt_contract:
                usdt_balance = await client.get_balance(address, usdt_contract)
                usdt_balance_key = f"{address}_{network}_usdt"
                
                if usdt_balance > MIN_AMOUNT:
                    last_usdt_balance = self.last_balances.get(usdt_balance_key, 0)
                    
                    if usdt_balance > last_usdt_balance:
                        # USDT баланс увеличился
                        deposit_amount = usdt_balance - last_usdt_balance
                        logger.info(f"💰 Новый USDT депозит: +{deposit_amount} USDT на {address[:8]}... ({network.upper()})")
                        
                        # Обновляем USDT баланс пользователя
                        await self.db.update_balance(user_telegram_id, 'usdt', deposit_amount)
                        
                        # Записываем депозит
                        await self.db.record_deposit(
                            user_telegram_id, network, 'USDT', 
                            deposit_amount, f"usdt_balance_check_{int(time.time())}", address
                        )
                    
                    self.last_balances[usdt_balance_key] = usdt_balance
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка проверки баланса {address} в {network}: {e}")
            return False
    
    async def monitor_addresses(self):
        """Мониторинг всех адресов"""
        try:
            # Получаем все адреса из базы
            address_sets = await self.db.get_addresses()
            
            if not address_sets:
                logger.warning("⚠️ Адреса для мониторинга не найдены")
                return
            
            logger.info(f"🔍 Начинаем мониторинг {len(address_sets)} наборов адресов...")
            
            # Обрабатываем каждый набор адресов
            tasks = []
            for addr_set in address_sets:
                user_telegram_id = addr_set.get('assigned_to_telegram_id')
                if not user_telegram_id:
                    continue  # Пропускаем неназначенные адреса
                
                # Проверяем каждую сеть
                for network in NETWORKS.keys():
                    address_field = f"{network}_address"
                    address = addr_set.get(address_field)
                    
                    if address:
                        task = self.check_address_balance(address, network, user_telegram_id)
                        tasks.append(task)
            
            # Выполняем все проверки параллельно
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                successful = sum(1 for r in results if r is True)
                logger.info(f"✅ Обработано {successful}/{len(tasks)} проверок")
            
        except Exception as e:
            logger.error(f"❌ Ошибка мониторинга адресов: {e}")
    
    async def start_monitoring(self):
        """Запуск основного цикла мониторинга"""
        logger.info(f"🔄 Запуск мониторинга с интервалом {CHECK_INTERVAL} секунд")
        
        while True:
            try:
                start_time = time.time()
                logger.info(f"🔍 Начинаем цикл проверки в {datetime.now().strftime('%H:%M:%S')}")
                
                await self.monitor_addresses()
                
                end_time = time.time()
                duration = end_time - start_time
                logger.info(f"⏱️ Цикл завершен за {duration:.2f} секунд")
                
                # Ждем до следующей проверки
                await asyncio.sleep(CHECK_INTERVAL)
                
            except KeyboardInterrupt:
                logger.info("🛑 Остановка мониторинга по запросу пользователя")
                break
            except Exception as e:
                logger.error(f"❌ Ошибка в основном цикле: {e}")
                await asyncio.sleep(CHECK_INTERVAL)

async def main():
    """Главная функция"""
    logger.info("🌟 Запуск DreamWallet Blockchain Monitor")
    
    # Создаем и инициализируем монитор
    monitor = BlockchainMonitor()
    await monitor.initialize()
    
    # Запускаем мониторинг
    await monitor.start_monitoring()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Мониторинг остановлен")
    except Exception as e:
        logger.error(f"💥 Критическая ошибка: {e}")
        raise
