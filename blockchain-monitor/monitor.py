# Main blockchain monitor
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Set
from database import SupabaseClient
from blockchain_clients import create_blockchain_client
from config import NETWORKS, CHECK_INTERVAL, MIN_AMOUNT, REQUEST_DELAY, BATCH_SIZE, MAX_RETRIES, RETRY_DELAY, logger

class BlockchainMonitor:
    """Основной класс для мониторинга блокчейнов"""
    
    def __init__(self):
        self.processed_txs: Set[str] = set()
        self.db = SupabaseClient(self.processed_txs)
        self.clients = {}
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
            logger.warning(f"⚠️ Клиент для {network} не найден")
            return False
        
        client = self.clients[network]
        network_config = NETWORKS[network]
        
        try:
            logger.debug(f"🔍 Проверяем {network.upper()} адрес: {address[:8]}... для пользователя {user_telegram_id}")
            
            # Получаем последние транзакции для нативного токена
            native_transactions = await client.get_transactions(address)
            
            for tx in native_transactions:
                tx_hash = tx.get('hash') or tx.get('txid') or tx.get('signature', '')
                if not tx_hash:
                    logger.debug(f"🔍 Пропускаем транзакцию без хеша: {tx}")
                    continue
                    
                if tx_hash in self.processed_txs:
                    continue
                
                # Проверяем что это входящая транзакция (TO адрес = наш адрес)
                to_address = tx.get('to', '').lower()
                from_address = tx.get('from', '').lower()
                our_address = address.lower()
                
                # Для разных сетей может быть разная логика определения входящих транзакций
                is_incoming = False
                # Определяем тип транзакции
                tx_type = tx.get('type', 'incoming')  # По умолчанию входящая
                
                if network == 'ton':
                    # Для TON проверяем и to и destination, плюс разные форматы адресов (UQ/EQ)
                    # Сравниваем без префиксов UQ/EQ
                    our_addr_clean = our_address[2:] if our_address.startswith(('uq', 'eq')) else our_address
                    to_addr_clean = to_address[2:] if to_address.startswith(('uq', 'eq')) else to_address
                    from_addr_clean = from_address[2:] if from_address.startswith(('uq', 'eq')) else from_address
                    
                    # Проверяем точное соответствие и похожесть (первые 40 символов)
                    to_match = (to_address == our_address or 
                              tx.get('destination', '').lower() == our_address or
                              (to_addr_clean and our_addr_clean and to_addr_clean == our_addr_clean) or
                              (len(our_addr_clean) >= 40 and len(to_addr_clean) >= 40 and our_addr_clean[:40] == to_addr_clean[:40]))
                    
                    from_match = (from_address == our_address or 
                                tx.get('source', '').lower() == our_address or
                                (from_addr_clean and our_addr_clean and from_addr_clean == our_addr_clean) or
                                (len(our_addr_clean) >= 40 and len(from_addr_clean) >= 40 and our_addr_clean[:40] == from_addr_clean[:40]))
                    
                    if tx_type == 'incoming':
                        is_incoming = to_match
                    elif tx_type == 'outgoing':
                        is_incoming = from_match  # Для исходящих - это "наша" транзакция если мы отправители
                    else:
                        is_incoming = to_match  # Fallback
                    
                    logger.debug(f"🔍 TON проверка: наш={our_address[:8]}..., to={to_address[:8] if to_address else 'N/A'}..., from={from_address[:8] if from_address else 'N/A'}..., type={tx_type}, match={is_incoming}")
                else:
                    if tx_type == 'incoming':
                        is_incoming = (to_address == our_address and from_address != our_address)
                    elif tx_type == 'outgoing':
                        is_incoming = (from_address == our_address and to_address != our_address)
                    else:
                        is_incoming = (to_address == our_address and from_address != our_address)
                
                if is_incoming:
                    # Это наша транзакция (входящая или исходящая)
                    amount = float(tx.get('amount', 0))
                    if amount > MIN_AMOUNT:
                        currency = network_config['native_token'].lower()
                        
                        if tx_type == 'incoming':
                            logger.info(f"💰 ВХОДЯЩАЯ {currency.upper()}: +{amount} {currency.upper()} на {address[:8]}... от {from_address[:8] if from_address else 'N/A'}... (tx: {tx_hash[:8]}...)")
                            
                            # Обновляем баланс пользователя (добавляем)
                            balance_updated = await self.db.update_balance(user_telegram_id, currency, amount)
                            if balance_updated:
                                logger.info(f"✅ Баланс обновлен: +{amount} {currency.upper()} для пользователя {user_telegram_id}")
                            
                            # Записываем депозит
                            deposit_recorded = await self.db.record_deposit(
                                user_telegram_id, network, currency.upper(), 
                                amount, tx_hash, address
                            )
                            if deposit_recorded:
                                logger.info(f"📝 Депозит записан в базу")
                                
                        elif tx_type == 'outgoing':
                            logger.info(f"💸 ИСХОДЯЩАЯ {currency.upper()}: -{amount} {currency.upper()} с {address[:8]}... к {to_address[:8] if to_address else 'N/A'}... (tx: {tx_hash[:8]}...)")
                            
                            # Обновляем баланс пользователя (вычитаем)
                            balance_updated = await self.db.update_balance(user_telegram_id, currency, -amount)
                            if balance_updated:
                                logger.info(f"✅ Баланс обновлен: -{amount} {currency.upper()} для пользователя {user_telegram_id}")
                            
                            # Записываем вывод
                            withdrawal_recorded = await self.db.record_withdrawal(
                                user_telegram_id, network, currency.upper(), 
                                amount, tx_hash, address, to_address
                            )
                            if withdrawal_recorded:
                                logger.info(f"📝 Вывод записан в базу")
                        
                        # Отмечаем транзакцию как обработанную
                        self.processed_txs.add(tx_hash)
            
            # Проверяем USDT транзакции если есть контракт
            usdt_contract = network_config.get('usdt_contract')
            if usdt_contract:
                logger.debug(f"🔍 Проверяем USDT контракт {usdt_contract} для {address[:8]}...")
                usdt_transactions = await client.get_transactions(address, usdt_contract)
                
                for tx in usdt_transactions:
                    tx_hash = tx.get('hash') or tx.get('txid') or tx.get('signature', '') or tx.get('transaction_id', '')
                    if not tx_hash:
                        logger.debug(f"🔍 Пропускаем USDT транзакцию без хеша: {tx}")
                        continue
                        
                    if tx_hash in self.processed_txs:
                        continue
                    
                    # Проверяем что это входящая USDT транзакция
                    to_address = tx.get('to', '').lower()
                    from_address = tx.get('from', '').lower()
                    our_address = address.lower()
                    
                    if to_address == our_address and from_address != our_address:
                        # Это входящая USDT транзакция
                        amount = float(tx.get('amount', 0))
                        if amount > MIN_AMOUNT:
                            logger.info(f"💰 ВХОДЯЩИЙ USDT: +{amount} USDT на {address[:8]}... от {from_address[:8] if from_address else 'N/A'}... ({network.upper()}, tx: {tx_hash[:8]}...)")
                            
                            # Обновляем USDT баланс пользователя
                            balance_updated = await self.db.update_balance(user_telegram_id, 'usdt', amount)
                            if balance_updated:
                                logger.info(f"✅ USDT баланс обновлен для пользователя {user_telegram_id}")
                            
                            # Записываем депозит
                            deposit_recorded = await self.db.record_deposit(
                                user_telegram_id, network, 'USDT', 
                                amount, tx_hash, address
                            )
                            if deposit_recorded:
                                logger.info(f"📝 USDT депозит записан в базу")
                            
                            # Отмечаем транзакцию как обработанную
                            self.processed_txs.add(tx_hash)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка проверки транзакций {address} в {network}: {e}")
            import traceback
            logger.error(f"Трейсбек: {traceback.format_exc()}")
            return False
    
    async def monitor_addresses(self):
        """Мониторинг всех адресов с обходом лимитов"""
        try:
            # Получаем все АКТИВНЫЕ адреса из базы (is_used = true)
            address_sets = await self.db.get_addresses()
            
            if not address_sets:
                logger.warning("⚠️ Активные адреса для мониторинга не найдены (is_used = true)")
                return
            
            logger.info(f"🔍 Начинаем мониторинг {len(address_sets)} АКТИВНЫХ наборов адресов...")
            
            # Обрабатываем пакетами для обхода лимитов
            total_checks = 0
            successful_checks = 0
            
            for addr_set in address_sets:
                user_telegram_id = addr_set.get('assigned_to_telegram_id')
                if not user_telegram_id:
                    logger.warning(f"⚠️ Пропускаем набор без telegram_id: {addr_set.get('name', 'unknown')}")
                    continue
                
                logger.info(f"👤 Проверяем адреса пользователя {user_telegram_id} (набор: {addr_set.get('name', 'unknown')})")
                
                # Проверяем каждую сеть с задержками
                for network in NETWORKS.keys():
                    address_field = f"{network}_address"
                    address = addr_set.get(address_field)
                    
                    if address and address.strip():
                        logger.debug(f"🔍 Проверяем {network.upper()}: {address}")
                        
                        # Добавляем задержку между запросами
                        if total_checks > 0:
                            await asyncio.sleep(REQUEST_DELAY)
                        
                        # Проверяем транзакции с повторными попытками и обработкой лимитов
                        success = False
                        for attempt in range(MAX_RETRIES):
                            try:
                                success = await self.check_address_transactions(address, network, user_telegram_id)
                                if success:
                                    successful_checks += 1
                                    break
                                else:
                                    logger.warning(f"⚠️ Попытка {attempt + 1}/{MAX_RETRIES} не удалась для {network}:{address[:8]}...")
                            except Exception as e:
                                error_msg = str(e).lower()
                                
                                # Обрабатываем разные типы ошибок
                                if "429" in error_msg or "too many requests" in error_msg:
                                    logger.error(f"🚫 Rate limit для {network}:{address[:8]}... - ждем {RETRY_DELAY} секунд")
                                    await asyncio.sleep(RETRY_DELAY)
                                elif "400" in error_msg or "bad request" in error_msg:
                                    logger.error(f"⚠️ Неправильный адрес {network}:{address[:8]}... - пропускаем")
                                    break  # Не повторяем для неправильных адресов
                                else:
                                    logger.error(f"❌ Ошибка попытки {attempt + 1}/{MAX_RETRIES} для {network}:{address[:8]}...: {e}")
                                
                                if attempt < MAX_RETRIES - 1:
                                    await asyncio.sleep(REQUEST_DELAY * 2)  # Увеличенная задержка при ошибке
                        
                        total_checks += 1
                    else:
                        logger.debug(f"🔍 Пропускаем пустой {network} адрес для пользователя {user_telegram_id}")
            
            logger.info(f"✅ Мониторинг завершен: {successful_checks}/{total_checks} успешных проверок")
            
        except Exception as e:
            logger.error(f"❌ Ошибка мониторинга адресов: {e}")
            import traceback
            logger.error(f"Трейсбек: {traceback.format_exc()}")
    
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
