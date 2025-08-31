const User = require('../../database/models/User');
const Transaction = require('../../database/models/Transaction');
const MessageFormatter = require('../utils/messageFormatter');

async function handleHistory(bot, msg) {
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
        
        const transactions = await Transaction.getUserHistory(telegramId, 10);
        const message = MessageFormatter.formatHistory(transactions, telegramId);
        
        await bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing history command
        await bot.sendMessage(
            msg.chat.id,
            MessageFormatter.formatError('Failed to get transaction history. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleHistory };