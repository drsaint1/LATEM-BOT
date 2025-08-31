const User = require('../../database/models/User');
const Balance = require('../../database/models/Balance');
const WalletManager = require('../../blockchain/wallet');
const { MESSAGES, TOKENS, NETWORKS } = require('../../utils/constants');
const MessageFormatter = require('../utils/messageFormatter');

async function handleStart(bot, msg) {
    const telegramId = msg.from.id;
    const username = msg.from.username;
    
    try {
        const existingUser = await User.findByTelegramId(telegramId);
        
        if (existingUser) {
            const networkList = Object.entries(NETWORKS)
                .map(([key, network]) => `• ${network.NAME} (${key})`)
                .join('\n');
            
            const message = `👋 Welcome back, @${username}!

🌐 **Multi-Chain Wallet Ready:**
${networkList}

💰 **Supported Tokens:** USDC, USDT, ETH/MATIC
🔄 **Current Network:** ${existingUser.preferred_network || 'BASE'}

🚀 Use /network to switch networks\n📊 Use /balance to check all balances\n❓ Use /help for all commands`;
            return bot.sendMessage(msg.chat.id, message);
        }
        
        const walletManager = new WalletManager();
        const newWallet = walletManager.generateWallet();
        
        const encryptedPrivateKey = walletManager.encryptAndStoreWallet(
            newWallet.privateKey,
            process.env.PRIVATE_KEY_PASSWORD
        );
        
        await User.create(
            telegramId,
            username,
            newWallet.address,
            encryptedPrivateKey
        );
        
        // Initialize balance entries for all networks and tokens
        for (const [networkName, tokens] of Object.entries(TOKENS)) {
            for (const token of Object.values(tokens)) {
                await Balance.createOrUpdate(
                    telegramId,
                    token.symbol,
                    networkName,
                    0
                );
            }
        }
        
        await bot.sendMessage(msg.chat.id, MESSAGES.WELCOME);
        
        const depositMessage = MessageFormatter.formatDepositInfo(newWallet.address);
        await bot.sendMessage(msg.chat.id, depositMessage, { parse_mode: 'Markdown' });
        
        // Show network switching info
        const networkInfo = `🌍 **Network Commands:**

• \`/network\` - View & switch networks
• \`/network POLYGON\` - Switch to Polygon
• \`/network ARBITRUM\` - Switch to Arbitrum
• \`/balance POLYGON\` - Check Polygon balance
• \`/deposit ARBITRUM\` - Get Arbitrum address

🚀 Start with Base Sepolia, switch anytime!`;
        
        await bot.sendMessage(msg.chat.id, networkInfo, { parse_mode: 'Markdown' });
        
        // New user wallet created successfully
        
    } catch (error) {
        // Error occurred during user registration
        
        await bot.sendMessage(
            msg.chat.id,
            MessageFormatter.formatError(`Failed to create your wallet: ${error.message}`)
        );
    }
}

module.exports = { handleStart };