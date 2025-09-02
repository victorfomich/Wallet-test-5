# Database helper for Supabase
import httpx
import json
from typing import List, Dict, Optional
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, logger

class SupabaseClient:
    def __init__(self):
        self.base_url = SUPABASE_URL
        self.headers = {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
    
    async def get_addresses(self) -> List[Dict]:
        """Получить все адреса из базы данных"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/address_sets"
                params = {
                    'select': 'id,name,ton_address,tron_address,sol_address,eth_address,bnb_address,assigned_to,assigned_user_id'
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                addresses = response.json()
                logger.info(f"📊 Загружено {len(addresses)} наборов адресов")
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
    
    async def update_balance(self, telegram_id: int, currency: str, amount: float) -> bool:
        """Обновить баланс пользователя (добавить к существующему)"""
        try:
            # Получаем текущий баланс
            current_balance = await self.get_user_balance(telegram_id)
            if not current_balance:
                logger.warning(f"⚠️ Баланс для пользователя {telegram_id} не найден")
                return False
            
            # Определяем поле для обновления
            currency_field = f"{currency.lower()}_amount"
            
            # Вычисляем новый баланс
            current_amount = float(current_balance.get(currency_field, 0))
            new_amount = current_amount + amount
            
            # Обновляем баланс
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/rest/v1/user_balances"
                params = {'telegram_id': f'eq.{telegram_id}'}
                
                update_data = {
                    currency_field: new_amount,
                    'updated_at': 'now()'
                }
                
                response = await client.patch(
                    url, 
                    headers=self.headers, 
                    params=params,
                    json=update_data
                )
                response.raise_for_status()
                
                logger.info(f"💰 Баланс обновлен: {telegram_id} +{amount} {currency.upper()} (было: {current_amount}, стало: {new_amount})")
                return True
                
        except Exception as e:
            logger.error(f"❌ Ошибка обновления баланса: {e}")
            return False
    
    async def record_deposit(self, telegram_id: int, network: str, currency: str, amount: float, tx_hash: str, address: str) -> bool:
        """Записать депозит в таблицу транзакций"""
        try:
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
                
                response = await client.post(
                    url,
                    headers=self.headers,
                    json=deposit_data
                )
                response.raise_for_status()
                
                logger.info(f"📝 Депозит записан: {amount} {currency.upper()} на {network.upper()} (tx: {tx_hash[:16]}...)")
                return True
                
        except Exception as e:
            logger.error(f"❌ Ошибка записи депозита: {e}")
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
                    'select': 'assigned_to',
                    address_field: f'eq.{address}'
                }
                
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                
                results = response.json()
                if results and results[0].get('assigned_to'):
                    return int(results[0]['assigned_to'])
                
                return None
                
        except Exception as e:
            logger.error(f"❌ Ошибка поиска пользователя по адресу {address}: {e}")
            return None
