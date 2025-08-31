const User = require('../../database/models/User');
const Transaction = require('../../database/models/Transaction');
const MessageFormatter = require('../utils/messageFormatter');

async function handleStats(bot, msg) {
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
        
        const transactions = await Transaction.getUserHistory(telegramId, 1000);
        
        const sentTransactions = transactions.filter(tx => tx.from_telegram_id === telegramId && tx.status === 'completed');
        const receivedTransactions = transactions.filter(tx => tx.to_telegram_id === telegramId && tx.status === 'completed');
        
        const message = MessageFormatter.formatUserStats(
            user,
            sentTransactions.length,
            receivedTransactions.length
        );
        
        await bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing stats command
        await bot.sendMessage(
            msg.chat.id,
            MessageFormatter.formatError('Failed to get your stats. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleStats };