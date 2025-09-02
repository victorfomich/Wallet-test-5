# Database helper for Supabase
import httpx
import json
from typing import List, Dict, Optional
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, logger

class SupabaseClient:
    def __init__(self, processed_txs=None):
        self.base_url = SUPABASE_URL
        self.headers = {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.processed_txs = processed_txs or set()
    
    async def get_addresses(self) -> List[Dict]:
        """Получить ТОЛЬКО активные адреса (is_used = TRUE) из базы данных"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/address_sets"
                params = {
                    'select': '*',
                    'is_used': 'eq.true',  # ТОЛЬКО активные адреса
                    'assigned_to_telegram_id': 'not.is.null'  # И только те что назначены пользователям
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                addresses = response.json()
                logger.info(f"📊 Загружено {len(addresses)} АКТИВНЫХ наборов адресов (is_used=true)")
                
                # Отладка: показываем структуру первого адреса
                if addresses and len(addresses) > 0:
                    logger.info(f"🔍 Структура адреса: {list(addresses[0].keys())}")
                    logger.info(f"🎯 Первый адрес: telegram_id={addresses[0].get('assigned_to_telegram_id')}, is_used={addresses[0].get('is_used')}")
                
                return addresses
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения адресов: {e}")
            return []
    
    async def get_user_balance(self, telegram_id: int) -> Optional[Dict]:
        """Получить баланс пользователя"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/user_balances"
                params = {'telegram_id': f'eq.{telegram_id}', 'select': '*'}
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                balances = response.json()
                return balances[0] if balances else None
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения баланса для {telegram_id}: {e}")
            return None
    
    async def create_user_balance_if_not_exists(self, telegram_id: int) -> bool:
        """Создать баланс пользователя если его нет"""
        try:
            # Проверяем существует ли баланс
            existing_balance = await self.get_user_balance(telegram_id)
            if existing_balance:
                return True
            
            # Создаем новый баланс
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/user_balances"
                
                balance_data = {
                    'telegram_id': telegram_id,
                    'usdt_amount': 0,
                    'eth_amount': 0,
                    'ton_amount': 0,
                    'sol_amount': 0,
                    'trx_amount': 0
                }
                
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=balance_data
                )
                response.raise_for_status()
                
                logger.info(f"✅ Создан новый баланс для пользователя {telegram_id}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Ошибка создания баланса для {telegram_id}: {e}")
            return False
    
    async def update_balance(self, telegram_id: int, currency: str, amount: float) -> bool:
        """Обновить баланс пользователя (добавить к существующему)"""
        try:
            # Сначала убеждаемся что у пользователя есть баланс
            balance_created = await self.create_user_balance_if_not_exists(telegram_id)
            if not balance_created:
                logger.error(f"❌ Не удалось создать/получить баланс для {telegram_id}")
                return False
            
            # Получаем текущий баланс
            current_balance = await self.get_user_balance(telegram_id)
            if not current_balance:
                logger.error(f"❌ Баланс для пользователя {telegram_id} не найден даже после создания")
                return False
            
            # Определяем поле для обновления
            currency_field = f"{currency.lower()}_amount"
            
            # Вычисляем новый баланс
            current_amount = float(current_balance.get(currency_field, 0))
            new_amount = current_amount + amount
            
            logger.info(f"💰 Обновляем баланс: {telegram_id} {currency.upper()} {current_amount} + {amount} = {new_amount}")
            
            # Обновляем баланс
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/user_balances"
                params = {'telegram_id': f'eq.{telegram_id}'}
                
                update_data = {
                    currency_field: new_amount
                }
                
                response = await client.patch(
                    url, 
                    headers=self.headers, 
                    params=params,
                    json=update_data
                )
                response.raise_for_status()
                
                logger.info(f"✅ Баланс успешно обновлен: {telegram_id} +{amount} {currency.upper()} (было: {current_amount}, стало: {new_amount})")
                return True
                
        except Exception as e:
            logger.error(f"❌ Ошибка обновления баланса: {e}")
            import traceback
            logger.error(f"Трейсбек: {traceback.format_exc()}")
            return False
    
    async def record_deposit(self, telegram_id: int, network: str, currency: str, amount: float, tx_hash: str, address: str) -> bool:
        """Записать депозит в таблицу транзакций"""
        try:
            # Проверяем что эта транзакция уже не записана
            if tx_hash in self.processed_txs:
                logger.debug(f"🔍 Транзакция {tx_hash[:16]}... уже обработана, пропускаем")
                return True
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/wallet_transactions"
                
                deposit_data = {
                    'user_telegram_id': telegram_id,
                    'transaction_type': 'deposit',
                    'crypto_currency': currency.upper(),
                    'blockchain_network': network.lower(),
                    'withdraw_amount': amount,  # для депозитов это будет сумма поступления
                    'network_fee': 0,
                    'recipient_address': address,
                    'blockchain_hash': tx_hash,
                    'transaction_status': 'completed',
                    'user_comment': f'Автоматический депозит через мониторинг {network.upper()}'
                }
                
                logger.info(f"📝 Записываем депозит: {amount} {currency.upper()} для пользователя {telegram_id} (tx: {tx_hash[:16]}...)")
                
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=deposit_data
                )
                
                if response.status_code == 201:
                    logger.info(f"✅ Депозит успешно записан: {amount} {currency.upper()} на {network.upper()} (tx: {tx_hash[:16]}...)")
                    return True
                else:
                    logger.error(f"❌ Ошибка записи депозита: статус {response.status_code}, ответ: {response.text}")
                    return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка записи депозита: {e}")
            import traceback
            logger.error(f"Трейсбек: {traceback.format_exc()}")
            return False
    
    async def record_withdrawal(self, telegram_id: int, network: str, currency: str, amount: float, tx_hash: str, from_address: str, to_address: str) -> bool:
        """Записать вывод в таблицу транзакций"""
        try:
            # Проверяем что эта транзакция уже не записана
            if tx_hash in self.processed_txs:
                logger.debug(f"🔍 Вывод {tx_hash[:16]}... уже обработан, пропускаем")
                return True
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/wallet_transactions"
                
                withdrawal_data = {
                    'user_telegram_id': telegram_id,
                    'transaction_type': 'withdraw',
                    'crypto_currency': currency.upper(),
                    'blockchain_network': network.lower(),
                    'withdraw_amount': amount,
                    'network_fee': 0,  # Можно добавить расчет комиссии позже
                    'recipient_address': to_address,
                    'blockchain_hash': tx_hash,
                    'transaction_status': 'completed',
                    'user_comment': f'Автоматический вывод через мониторинг {network.upper()}'
                }
                
                logger.info(f"📝 Записываем вывод: {amount} {currency.upper()} для пользователя {telegram_id} (tx: {tx_hash[:16]}...)")
                
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=withdrawal_data
                )
                
                if response.status_code == 201:
                    logger.info(f"✅ Вывод успешно записан: {amount} {currency.upper()} с {network.upper()} (tx: {tx_hash[:16]}...)")
                    return True
                else:
                    logger.error(f"❌ Ошибка записи вывода: статус {response.status_code}, ответ: {response.text}")
                    return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка записи вывода: {e}")
            import traceback
            logger.error(f"Трейсбек: {traceback.format_exc()}")
            return False
    
    async def get_processed_transactions(self, limit: int = 1000) -> List[str]:
        """Получить список уже обработанных транзакций"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/wallet_transactions"
                params = {
                    'select': 'blockchain_hash',
                    'transaction_type': 'eq.deposit',
                    'limit': limit,
                    'order': 'created_timestamp.desc'
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                transactions = response.json()
                return [tx['blockchain_hash'] for tx in transactions if tx.get('blockchain_hash')]
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения обработанных транзакций: {e}")
            return []
    
    async def find_user_by_address(self, address: str, network: str) -> Optional[int]:
        """Найти telegram_id пользователя по адресу"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/address_sets"
                
                # Определяем поле адреса в зависимости от сети
                address_field = f"{network}_address"
                params = {
                    'select': 'assigned_to_telegram_id',
                    address_field: f'eq.{address}'
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                results = response.json()
                if results and results[0].get('assigned_to_telegram_id'):
                    return int(results[0]['assigned_to_telegram_id'])
                
                return None
                
        except Exception as e:
            logger.error(f"❌ Ошибка поиска пользователя по адресу {address}: {e}")
            return None
