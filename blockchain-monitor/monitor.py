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
    
    async def check_address_transactions(self, address: str, network: str, user_telegram_id: int) -> bool:
        """Проверить новые транзакции конкретного адреса"""
        if network not in self.clients:
            return False
        
        client = self.clients[network]
        network_config = NETWORKS[network]
        
        try:
            # Получаем последние транзакции для нативного токена
            native_transactions = await client.get_transactions(address)
            
            for tx in native_transactions:
                tx_hash = tx.get('hash') or tx.get('txid') or tx.get('signature', '')
                if not tx_hash or tx_hash in self.processed_txs:
                    continue
                
                # Проверяем что это входящая транзакция (TO адрес = наш адрес)
                to_address = tx.get('to', '').lower()
                from_address = tx.get('from', '').lower()
                our_address = address.lower()
                
                if to_address == our_address and from_address != our_address:
                    # Это входящая транзакция
                    amount = float(tx.get('amount', 0))
                    if amount > MIN_AMOUNT:
                        currency = network_config['native_token'].lower()
                        if currency == 'trx':
                            currency = 'trx'
                        
                        logger.info(f"💰 Входящая транзакция: +{amount} {currency.upper()} на {address[:8]}... (tx: {tx_hash[:8]}...)")
                        
                        # Обновляем баланс пользователя
                        await self.db.update_balance(user_telegram_id, currency, amount)
                        
                        # Записываем депозит
                        await self.db.record_deposit(
                            user_telegram_id, network, currency.upper(), 
                            amount, tx_hash, address
                        )
                        
                        # Отмечаем транзакцию как обработанную
                        self.processed_txs.add(tx_hash)
            
            # Проверяем USDT транзакции если есть контракт
            usdt_contract = network_config.get('usdt_contract')
            if usdt_contract:
                usdt_transactions = await client.get_transactions(address, usdt_contract)
                
                for tx in usdt_transactions:
                    tx_hash = tx.get('hash') or tx.get('txid') or tx.get('signature', '')
                    if not tx_hash or tx_hash in self.processed_txs:
                        continue
                    
                    # Проверяем что это входящая USDT транзакция
                    to_address = tx.get('to', '').lower()
                    from_address = tx.get('from', '').lower()
                    our_address = address.lower()
                    
                    if to_address == our_address and from_address != our_address:
                        # Это входящая USDT транзакция
                        amount = float(tx.get('amount', 0))
                        if amount > MIN_AMOUNT:
                            logger.info(f"💰 Входящая USDT: +{amount} USDT на {address[:8]}... ({network.upper()}, tx: {tx_hash[:8]}...)")
                            
                            # Обновляем USDT баланс пользователя
                            await self.db.update_balance(user_telegram_id, 'usdt', amount)
                            
                            # Записываем депозит
                            await self.db.record_deposit(
                                user_telegram_id, network, 'USDT', 
                                amount, tx_hash, address
                            )
                            
                            # Отмечаем транзакцию как обработанную
                            self.processed_txs.add(tx_hash)
            
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
                        task = self.check_address_transactions(address, network, user_telegram_id)
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
