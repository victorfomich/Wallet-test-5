# Configuration for Blockchain Monitor
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase Configuration
SUPABASE_URL = "https://qvinjcaarnmafqdtfzrf.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aW5qY2Fhcm5tYWZxZHRmenJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0OTI3NCwiZXhwIjoyMDcyMjI1Mjc0fQ.zL83Oek15xysWDm52AnDVwNQfz8cqX4dA0SyHOwTVAE"

# Blockchain RPC URLs (Free endpoints)
ETHEREUM_RPC_URL = "https://eth.public-rpc.com"
BNB_RPC_URL = "https://bsc-dataseed.binance.org/"
SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com"
TRON_RPC_URL = "https://api.trongrid.io"
TON_API_URL = "https://toncenter.com/api/v2"

# Monitor Settings
CHECK_INTERVAL = 30  # seconds
BATCH_SIZE = 20      # addresses per batch
MIN_AMOUNT = 0.000001  # minimum amount to track

# Supported Networks
NETWORKS = {
    'ton': {
        'name': 'TON',
        'native_token': 'TON',
        'decimals': 9,
        'usdt_contract': None  # TON has native USDT
    },
    'tron': {
        'name': 'TRON',
        'native_token': 'TRX',
        'decimals': 6,
        'usdt_contract': 'TR7NHqjeKQxGTCi8q8ZY4pkmGE6T6RkXeS'  # USDT TRC20
    },
    'sol': {
        'name': 'Solana',
        'native_token': 'SOL',
        'decimals': 9,
        'usdt_contract': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  # USDT SPL
    },
    'eth': {
        'name': 'Ethereum',
        'native_token': 'ETH',
        'decimals': 18,
        'usdt_contract': '0xdAC17F958D2ee523a2206206994597C13D831ec7'  # USDT ERC20
    },
    'bnb': {
        'name': 'BNB Smart Chain',
        'native_token': 'BNB',
        'decimals': 18,
        'usdt_contract': '0x55d398326f99059fF775485246999027B3197955'  # USDT BEP20
    }
}

# Database Tables
TABLES = {
    'users': 'users',
    'address_sets': 'address_sets',
    'user_balances': 'user_balances',
    'deposits': 'wallet_transactions'  # для записи депозитов
}

# Logging Configuration
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('monitor.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
