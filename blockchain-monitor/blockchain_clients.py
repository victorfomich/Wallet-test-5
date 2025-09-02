# Blockchain clients for different networks
import httpx
import json
import asyncio
from typing import List, Dict, Optional, Tuple
from abc import ABC, abstractmethod
from config import logger, MIN_AMOUNT
from datetime import datetime, timedelta
import time

def is_recent_transaction(timestamp: int, max_age_minutes: int = 5) -> bool:
    """Проверить что транзакция была в последние N минут"""
    if not timestamp:
        return False
    
    current_time = int(time.time())
    transaction_time = timestamp
    
    # Если timestamp в миллисекундах, конвертируем в секунды
    if timestamp > 1000000000000:
        transaction_time = timestamp // 1000
    
    age_seconds = current_time - transaction_time
    max_age_seconds = max_age_minutes * 60
    
    is_recent = age_seconds <= max_age_seconds
    
    if is_recent:
        logger.debug(f"⏰ Транзакция свежая: {age_seconds} сек назад (макс: {max_age_seconds} сек)")
    else:
        logger.debug(f"⏰ Транзакция старая: {age_seconds} сек назад (макс: {max_age_seconds} сек) - пропускаем")
    
    return is_recent

class BlockchainClient(ABC):
    """Базовый класс для клиентов блокчейнов"""
    
    def __init__(self, network: str, rpc_url: str):
        self.network = network
        self.rpc_url = rpc_url
    
    @abstractmethod
    async def get_balance(self, address: str, token_contract: str = None) -> float:
        """Получить баланс адреса"""
        pass
    
    @abstractmethod
    async def get_transactions(self, address: str, token_contract: str = None) -> List[Dict]:
        """Получить последние транзакции"""
        pass

class TronClient(BlockchainClient):
    """Клиент для TRON сети"""
    
    def __init__(self):
        super().__init__('tron', 'https://api.trongrid.io')
    
    async def get_balance(self, address: str, token_contract: str = None) -> float:
        """Получить баланс TRX или USDT TRC20"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                if token_contract:
                    # USDT TRC20 баланс
                    url = f"{self.rpc_url}/v1/accounts/{address}/transactions/trc20"
                    params = {
                        'contract_address': token_contract,
                        'limit': 1
                    }
                    response = await client.get(url, params=params)
                    
                    if response.status_code == 200:
                        data = response.json()
                        # Для USDT TRC20 нужно делать дополнительный запрос баланса
                        balance_url = f"{self.rpc_url}/wallet/triggerconstantcontract"
                        contract_data = {
                            "owner_address": address,
                            "contract_address": token_contract,
                            "function_selector": "balanceOf(address)",
                            "parameter": address[2:].zfill(64) if address.startswith('T') else address
                        }
                        
                        balance_response = await client.post(balance_url, json=contract_data)
                        if balance_response.status_code == 200:
                            balance_data = balance_response.json()
                            if balance_data.get('result', {}).get('result'):
                                hex_balance = balance_data['constant_result'][0]
                                balance = int(hex_balance, 16) / (10 ** 6)  # USDT имеет 6 десятичных знаков
                                return balance
                else:
                    # Нативный TRX баланс
                    url = f"{self.rpc_url}/v1/accounts/{address}"
                    response = await client.get(url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        balance = data.get('balance', 0) / (10 ** 6)  # TRX имеет 6 десятичных знаков
                        return balance
                        
                return 0.0
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения баланса TRON для {address}: {e}")
            return 0.0
    
    async def get_transactions(self, address: str, token_contract: str = None) -> List[Dict]:
        """Получить последние транзакции TRON"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                transactions = []
                
                # Проверяем валидность TRON адреса
                if not address or not address.startswith('T') or len(address) != 34:
                    logger.warning(f"⚠️ Неправильный TRON адрес: {address}")
                    return []
                
                if token_contract:
                    # TRC20 транзакции (USDT)
                    url = f"{self.rpc_url}/v1/accounts/{address}/transactions/trc20"
                    params = {
                        'contract_address': token_contract,
                        'limit': 50,
                        'order_by': 'block_timestamp,desc'
                    }
                    
                    response = await client.get(url, params=params)
                    if response.status_code == 200:
                        data = response.json()
                        raw_txs = data.get('data', [])
                        
                        for tx in raw_txs:
                            # Проверяем что транзакция успешна
                            if tx.get('transaction_id') and tx.get('value'):
                                amount_raw = int(tx.get('value', 0))
                                amount = amount_raw / (10**6)  # USDT имеет 6 десятичных знаков
                                
                                # Нормализуем TRC20 транзакцию
                                normalized = {
                                    'hash': tx.get('transaction_id'),
                                    'from': tx.get('from'),
                                    'to': tx.get('to'),
                                    'amount': amount,
                                    'timestamp': tx.get('block_timestamp'),
                                    'token_contract': token_contract,
                                    'value_raw': amount_raw
                                }
                                transactions.append(normalized)
                                
                                logger.debug(f"🔍 TRON USDT транзакция: {amount} USDT, hash: {tx.get('transaction_id')}")
                else:
                    # Нативные TRX транзакции
                    url = f"{self.rpc_url}/v1/accounts/{address}/transactions"
                    params = {'limit': 50}
                    
                    response = await client.get(url, params=params)
                    if response.status_code == 200:
                        data = response.json()
                        raw_txs = data.get('data', [])
                        
                        for tx in raw_txs:
                            # Проверяем что это перевод TRX и транзакция успешна
                            contracts = tx.get('raw_data', {}).get('contract', [])
                            if (contracts and contracts[0].get('type') == 'TransferContract' 
                                and tx.get('ret', [{}])[0].get('contractRet') == 'SUCCESS'):
                                
                                contract_data = contracts[0]
                                parameter = contract_data.get('parameter', {}).get('value', {})
                                
                                amount_raw = int(parameter.get('amount', 0))
                                amount = amount_raw / (10**6)  # TRX имеет 6 десятичных знаков
                                
                                normalized = {
                                    'hash': tx.get('txID'),
                                    'from': parameter.get('owner_address'),
                                    'to': parameter.get('to_address'),
                                    'amount': amount,
                                    'timestamp': tx.get('block_timestamp'),
                                    'value_raw': amount_raw
                                }
                                transactions.append(normalized)
                                
                                logger.debug(f"🔍 TRON TRX транзакция: {amount} TRX, hash: {tx.get('txID')}")
                
                return transactions
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения транзакций TRON для {address}: {e}")
            return []

class EthereumClient(BlockchainClient):
    """Клиент для Ethereum/BNB сети"""
    
    def __init__(self, network: str, rpc_url: str):
        super().__init__(network, rpc_url)
        self.request_id = 1
    
    async def _make_rpc_call(self, method: str, params: List) -> Dict:
        """Выполнить RPC вызов"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "method": method,
                    "params": params,
                    "id": self.request_id
                }
                self.request_id += 1
                
                response = await client.post(self.rpc_url, json=payload)
                if response.status_code == 200:
                    return response.json()
                
                return {}
                
        except Exception as e:
            logger.error(f"❌ Ошибка RPC вызова {method}: {e}")
            return {}
    
    async def get_balance(self, address: str, token_contract: str = None) -> float:
        """Получить баланс ETH/BNB или ERC20/BEP20 токена"""
        try:
            if token_contract:
                # ERC20/BEP20 токен баланс
                # balanceOf(address)
                data = "0x70a08231" + address[2:].zfill(64)
                
                result = await self._make_rpc_call("eth_call", [
                    {"to": token_contract, "data": data},
                    "latest"
                ])
                
                if result.get('result'):
                    balance = int(result['result'], 16) / (10 ** 6)  # USDT имеет 6 десятичных знаков
                    return balance
            else:
                # Нативный ETH/BNB баланс
                result = await self._make_rpc_call("eth_getBalance", [address, "latest"])
                
                if result.get('result'):
                    balance = int(result['result'], 16) / (10 ** 18)  # ETH/BNB имеют 18 десятичных знаков
                    return balance
                    
            return 0.0
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения баланса {self.network.upper()} для {address}: {e}")
            return 0.0
    
    async def get_transactions(self, address: str, token_contract: str = None) -> List[Dict]:
        """Получить последние транзакции (ограниченная функциональность без API ключей)"""
        # Для получения истории транзакций нужны специальные API (Etherscan, BSCScan)
        # Пока возвращаем пустой список
        return []

class SolanaClient(BlockchainClient):
    """Клиент для Solana сети"""
    
    def __init__(self):
        super().__init__('solana', 'https://api.mainnet-beta.solana.com')
    
    async def _make_rpc_call(self, method: str, params: List) -> Dict:
        """Выполнить RPC вызов к Solana"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": method,
                    "params": params
                }
                
                response = await client.post(self.rpc_url, json=payload)
                if response.status_code == 200:
                    return response.json()
                
                return {}
                
        except Exception as e:
            logger.error(f"❌ Ошибка RPC вызова Solana {method}: {e}")
            return {}
    
    async def get_balance(self, address: str, token_contract: str = None) -> float:
        """Получить баланс SOL или SPL токена"""
        try:
            if token_contract:
                # SPL токен баланс (USDT)
                result = await self._make_rpc_call("getTokenAccountsByOwner", [
                    address,
                    {"mint": token_contract},
                    {"encoding": "jsonParsed"}
                ])
                
                if result.get('result', {}).get('value'):
                    accounts = result['result']['value']
                    if accounts:
                        token_amount = accounts[0]['account']['data']['parsed']['info']['tokenAmount']
                        balance = float(token_amount['uiAmount'] or 0)
                        return balance
            else:
                # Нативный SOL баланс
                result = await self._make_rpc_call("getBalance", [address])
                
                if result.get('result'):
                    balance = result['result']['value'] / (10 ** 9)  # SOL имеет 9 десятичных знаков
                    return balance
                    
            return 0.0
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения баланса Solana для {address}: {e}")
            return 0.0
    
    async def get_transactions(self, address: str, token_contract: str = None) -> List[Dict]:
        """Получить последние транзакции Solana"""
        try:
            result = await self._make_rpc_call("getSignaturesForAddress", [
                address,
                {"limit": 50}
            ])
            
            if result.get('result'):
                return result['result']
                
            return []
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения транзакций Solana для {address}: {e}")
            return []

class TONClient(BlockchainClient):
    """Клиент для TON сети"""
    
    def __init__(self):
        super().__init__('ton', 'https://toncenter.com/api/v2')
    
    async def get_balance(self, address: str, token_contract: str = None) -> float:
        """Получить баланс TON"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                url = f"{self.rpc_url}/getAddressBalance"
                params = {'address': address}
                
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok'):
                        balance = int(data['result']) / (10 ** 9)  # TON имеет 9 десятичных знаков
                        return balance
                        
                return 0.0
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения баланса TON для {address}: {e}")
            return 0.0
    
    async def get_transactions(self, address: str, token_contract: str = None) -> List[Dict]:
        """Получить последние транзакции TON"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                transactions = []
                
                # Проверяем валидность TON адреса
                if not address or len(address) < 20:
                    logger.warning(f"⚠️ Неправильный TON адрес: {address}")
                    return []
                
                logger.debug(f"🔍 Запрашиваем TON транзакции для: {address}")
                
                url = f"{self.rpc_url}/getTransactions"
                params = {
                    'address': address,
                    'limit': 50,
                    'archival': 'true'  # Важно для получения архивных данных
                }
                
                response = await client.get(url, params=params)
                logger.debug(f"TON API ответ: status={response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok'):
                        raw_txs = data.get('result', [])
                        
                        logger.info(f"🔍 TON API вернул {len(raw_txs)} транзакций для {address[:8]}...")
                        
                        for i, tx in enumerate(raw_txs):
                            # Проверяем время транзакции - только последние 5 минут
                            tx_timestamp = tx.get('utime')
                            if not is_recent_transaction(tx_timestamp):
                                continue
                            
                            # Нормализуем TON транзакцию
                            in_msg = tx.get('in_msg', {})
                            out_msgs = tx.get('out_msgs', [])
                            
                            logger.debug(f"TON транзакция #{i}: in_msg={bool(in_msg)}, out_msgs={len(out_msgs) if out_msgs else 0}")
                            
                            # Обрабатываем ВХОДЯЩИЕ транзакции
                            if in_msg and in_msg.get('value'):
                                try:
                                    amount_raw = int(in_msg.get('value', '0'))
                                    if amount_raw > 0:
                                        amount = amount_raw / (10**9)  # TON имеет 9 десятичных знаков
                                        
                                        # Получаем хеш транзакции правильно
                                        tx_hash = tx.get('transaction_id', {}).get('hash')
                                        if not tx_hash:
                                            tx_hash = f"lt_{tx.get('transaction_id', {}).get('lt', '')}"
                                        
                                        from_addr = in_msg.get('source', '')
                                        to_addr = in_msg.get('destination', '')
                                        
                                        normalized = {
                                            'hash': tx_hash,
                                            'from': from_addr,
                                            'to': to_addr,
                                            'amount': amount,
                                            'timestamp': tx.get('utime'),
                                            'value_raw': amount_raw,
                                            'type': 'incoming'
                                        }
                                        transactions.append(normalized)
                                        
                                        logger.info(f"💰 TON ВХОДЯЩАЯ: {amount} TON от {from_addr[:8] if from_addr else 'N/A'}... к {to_addr[:8] if to_addr else 'N/A'}... (hash: {tx_hash})")
                                except (ValueError, TypeError) as e:
                                    logger.debug(f"⚠️ Ошибка парсинга TON входящей: {e}")
                            
                            # Обрабатываем ИСХОДЯЩИЕ транзакции
                            if out_msgs:
                                for out_msg in out_msgs:
                                    if out_msg.get('value'):
                                        try:
                                            amount_raw = int(out_msg.get('value', '0'))
                                            if amount_raw > 0:
                                                amount = amount_raw / (10**9)
                                                
                                                tx_hash = tx.get('transaction_id', {}).get('hash')
                                                if not tx_hash:
                                                    tx_hash = f"lt_{tx.get('transaction_id', {}).get('lt', '')}"
                                                
                                                from_addr = out_msg.get('source', '')
                                                to_addr = out_msg.get('destination', '')
                                                
                                                normalized = {
                                                    'hash': tx_hash + '_out',  # Добавляем суффикс для исходящих
                                                    'from': from_addr,
                                                    'to': to_addr,
                                                    'amount': amount,
                                                    'timestamp': tx.get('utime'),
                                                    'value_raw': amount_raw,
                                                    'type': 'outgoing'
                                                }
                                                transactions.append(normalized)
                                                
                                                logger.info(f"💸 TON ИСХОДЯЩАЯ: {amount} TON от {from_addr[:8] if from_addr else 'N/A'}... к {to_addr[:8] if to_addr else 'N/A'}... (hash: {tx_hash})")
                                        except (ValueError, TypeError) as e:
                                            logger.debug(f"⚠️ Ошибка парсинга TON исходящей: {e}")
                        
                        logger.info(f"✅ TON: найдено {len(transactions)} входящих транзакций из {len(raw_txs)}")
                
                return transactions
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения транзакций TON для {address}: {e}")
            return []

# Фабрика клиентов
def create_blockchain_client(network: str) -> Optional[BlockchainClient]:
    """Создать клиент для указанной сети"""
    if network == 'tron':
        return TronClient()
    elif network == 'eth':
        return EthereumClient('ethereum', 'https://eth.public-rpc.com')
    elif network == 'bnb':
        return EthereumClient('bnb', 'https://bsc-dataseed.binance.org/')
    elif network == 'sol':
        return SolanaClient()
    elif network == 'ton':
        return TONClient()
    else:
        logger.warning(f"⚠️ Неподдерживаемая сеть: {network}")
        return None
