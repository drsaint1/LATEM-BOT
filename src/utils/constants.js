module.exports = {
    NETWORKS: {
        BASE: {
            CHAIN_ID: 84532,
            RPC_URL: 'https://sepolia.base.org',
            NAME: 'Base Sepolia',
            EXPLORER: 'https://sepolia.basescan.org'
        },
        POLYGON: {
            CHAIN_ID: 80001,
            RPC_URL: 'https://rpc-mumbai.maticvigil.com',
            NAME: 'Polygon Mumbai',
            EXPLORER: 'https://mumbai.polygonscan.com'
        },
        ARBITRUM: {
            CHAIN_ID: 421613,
            RPC_URL: 'https://goerli-rollup.arbitrum.io/rpc',
            NAME: 'Arbitrum Goerli',
            EXPLORER: 'https://goerli.arbiscan.io'
        }
    },
    
    TOKENS: {
        BASE: {
            USDC: {
                address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                decimals: 6,
                symbol: 'USDC'
            },
            USDT: {
                address: '0xf175520C52418dfE19C8098071a252da48Cd1C19',
                decimals: 6,
                symbol: 'USDT'
            },
            ETH: {
                address: 'native',
                decimals: 18,
                symbol: 'ETH'
            }
        },
        POLYGON: {
            USDC: {
                address: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
                decimals: 6,
                symbol: 'USDC'
            },
            USDT: {
                address: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832',
                decimals: 6,
                symbol: 'USDT'
            },
            MATIC: {
                address: 'native',
                decimals: 18,
                symbol: 'MATIC'
            }
        },
        ARBITRUM: {
            USDC: {
                address: '0x8FB1E3fC51F3b789dED7557E680551d93Ea9d892',
                decimals: 6,
                symbol: 'USDC'
            },
            USDT: {
                address: '0x533046F316590C19d99c74eE661c6d541b64471C',
                decimals: 6,
                symbol: 'USDT'
            },
            ETH: {
                address: 'native',
                decimals: 18,
                symbol: 'ETH'
            }
        }
    },
    
    LIMITS: {
        MAX_TIP_AMOUNT: 100,
        MAX_DAILY_AMOUNT: 500,
        MAX_GAS_SUBSIDY: 1,
        RATE_LIMIT_WINDOW: 3600000,
        RATE_LIMIT_MAX: 10,
        BALANCE_CACHE_MINUTES: 5
    },
    
    MESSAGES: {
        WELCOME: `🎉 Welcome to CryptoTip Bot!

Your multi-chain crypto wallet has been created! 🚀

🌐 **Supported Networks:**
✅ Base Sepolia (Default)
⚪ Polygon Mumbai  
⚪ Arbitrum Goerli

💰 **Available Tokens:**
• USDC, USDT, ETH/MATIC on all networks

🔧 **Quick Commands:**
• /balance - Check all balances
• /deposit - Get wallet address
• /network - Switch networks
• /tip @user 5 USDC - Send tips

Type /help for detailed commands.`,
        
        HELP: `💡 CryptoTip Bot Commands:

💰 **Wallet:**
/deposit [network] - Get your wallet address
/balance [network] - Check your balances  
/withdraw USDC 10 0x123... [network] - Send to external wallet
/network - Switch default network

🎁 **Tipping:**
/tip @alice 5 USDC thanks! - Send $5 USDC to alice
/tip @bob 0.001 ETH great meme - Send ETH
/batchtip @alice @bob 5 USDC - Send to multiple users
/split 20 @alice @bob @charlie - Split bill equally

📊 **Stats:**
/history - Recent transactions
/stats - Your tipping stats
/groupstats - Group leaderboard

🌐 **Networks:** Base, Polygon, Arbitrum
**Tokens:** USDC, USDT, ETH/MATIC
Max tip: $100 | Daily limit: $500`,
        
        INSUFFICIENT_FUNDS: (available, needed, token) => 
            `❌ Insufficient balance. You have ${available} ${token}, need ${needed} ${token}.`,
        
        USER_NOT_FOUND: (username) => 
            `❌ User @${username} not found. They need to /start the bot first.`,
        
        TIP_SUCCESS: (amount, token, recipient, txHash) =>
            `✅ Sent ${amount} ${token} to @${recipient}! Transaction: ${txHash}`,
        
        TIP_RECEIVED: (sender, amount, token, message) =>
            `🎉 @${sender} sent you ${amount} ${token}${message ? `: "${message}"` : '!'}`,
        
        DEPOSIT_DETECTED: (amount, token) =>
            `💰 Deposit confirmed! +${amount} ${token}`,
        
        NETWORK_ERROR: '⚠️ Network busy, trying again... Please wait.',
        
        INVALID_COMMAND: 'Invalid command format. Type /help for usage examples.',
        
        RATE_LIMITED: 'You are sending tips too quickly. Please wait a moment.',
        
        WITHDRAWAL_SUCCESS: (amount, token, address, txHash) =>
            `✅ Withdrew ${amount} ${token} to ${address}\nTransaction: ${txHash}`
    }
};