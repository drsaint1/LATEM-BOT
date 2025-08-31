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
            const message = `👋 Welcome back, @${username}!\n\nYour wallet is ready. Use /help for commands.`;
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