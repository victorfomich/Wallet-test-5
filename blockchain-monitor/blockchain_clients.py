# Blockchain clients for different networks
import httpx
import json
import asyncio
from typing import List, Dict, Optional, Tuple
from abc import ABC, abstractmethod
from config import logger, MIN_AMOUNT

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
                            # Нормализуем TRC20 транзакцию
                            normalized = {
                                'hash': tx.get('transaction_id'),
                                'from': tx.get('from'),
                                'to': tx.get('to'),
                                'amount': float(tx.get('value', 0)) / (10**6),  # USDT имеет 6 десятичных знаков
                                'timestamp': tx.get('block_timestamp'),
                                'token_contract': token_contract
                            }
                            transactions.append(normalized)
                else:
                    # Нативные TRX транзакции
                    url = f"{self.rpc_url}/v1/accounts/{address}/transactions"
                    params = {'limit': 50}
                    
                    response = await client.get(url, params=params)
                    if response.status_code == 200:
                        data = response.json()
                        raw_txs = data.get('data', [])
                        
                        for tx in raw_txs:
                            # Проверяем что это перевод TRX
                            if tx.get('raw_data', {}).get('contract', [{}])[0].get('type') == 'TransferContract':
                                contract_data = tx.get('raw_data', {}).get('contract', [{}])[0]
                                parameter = contract_data.get('parameter', {}).get('value', {})
                                
                                normalized = {
                                    'hash': tx.get('txID'),
                                    'from': parameter.get('owner_address'),
                                    'to': parameter.get('to_address'),
                                    'amount': float(parameter.get('amount', 0)) / (10**6),  # TRX имеет 6 десятичных знаков
                                    'timestamp': tx.get('block_timestamp')
                                }
                                transactions.append(normalized)
                
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
                
                url = f"{self.rpc_url}/getTransactions"
                params = {
                    'address': address,
                    'limit': 50
                }
                
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok'):
                        raw_txs = data.get('result', [])
                        
                        for tx in raw_txs:
                            # Нормализуем TON транзакцию
                            in_msg = tx.get('in_msg', {})
                            if in_msg and in_msg.get('value'):
                                normalized = {
                                    'hash': tx.get('transaction_id', {}).get('hash'),
                                    'from': in_msg.get('source'),
                                    'to': in_msg.get('destination'),
                                    'amount': float(in_msg.get('value', 0)) / (10**9),  # TON имеет 9 десятичных знаков
                                    'timestamp': tx.get('utime')
                                }
                                transactions.append(normalized)
                
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
