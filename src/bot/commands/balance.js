const User = require('../../database/models/User');
const Balance = require('../../database/models/Balance');
const WalletManager = require('../../blockchain/wallet');
const { TOKENS, NETWORKS } = require('../../utils/constants');
const MessageFormatter = require('../utils/messageFormatter');

async function handleBalance(bot, msg) {
    const telegramId = msg.from.id;
    
    try {
        const user = await User.findByTelegramId(telegramId);
        
        if (!user) {
            return bot.sendMessage(
                msg.chat.id,
                'Please /start the bot first to create your wallet.',
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const walletManager = new WalletManager();
        const balances = [];
        
        // Get user's preferred network or default to BASE
        const network = user.preferred_network || 'BASE';
        const tokens = TOKENS[network];
        
        if (!tokens) {
            return bot.sendMessage(
                msg.chat.id,
                `❌ Invalid network: ${network}. Use /network to switch.`,
                { reply_to_message_id: msg.message_id }
            );
        }
        
        for (const [symbol, token] of Object.entries(tokens)) {
            try {
                let balance;
                const cachedBalance = await Balance.get(telegramId, symbol, network);
                
                const isCacheValid = cachedBalance && 
                    await Balance.isBalanceCacheValid(telegramId, symbol, network);
                
                if (isCacheValid) {
                    balance = parseFloat(cachedBalance.balance);
                } else {
                    if (token.address === 'native') {
                        balance = parseFloat(await walletManager.getWalletBalance(
                            user.wallet_address, 
                            null, 
                            network, 
                            token.decimals
                        ));
                    } else {
                        balance = parseFloat(await walletManager.getWalletBalance(
                            user.wallet_address, 
                            token.address, 
                            network, 
                            token.decimals
                        ));
                    }
                    
                    await Balance.createOrUpdate(telegramId, symbol, network, balance);
                }
                
                balances.push({
                    token_symbol: symbol,
                    balance: balance,
                    network: network
                });
                
            } catch (error) {
                // Failed to fetch balance from network - will try cached balance
                
                const cachedBalance = await Balance.get(telegramId, symbol, network);
                if (cachedBalance) {
                    balances.push({
                        token_symbol: symbol,
                        balance: parseFloat(cachedBalance.balance),
                        network: network
                    });
                }
            }
        }
        
        const message = MessageFormatter.formatBalance(balances);
        await bot.sendMessage(msg.chat.id, message, { 
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id 
        });
        
    } catch (error) {
        // Error occurred while processing balance command
        await bot.sendMessage(
            msg.chat.id,
            MessageFormatter.formatError('Failed to get balance. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleBalance };