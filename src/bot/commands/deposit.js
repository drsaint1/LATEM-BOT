const User = require('../../database/models/User');
const MessageFormatter = require('../utils/messageFormatter');

async function handleDeposit(bot, msg) {
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
        
        const message = MessageFormatter.formatDepositInfo(user.wallet_address);
        
        if (msg.chat.type === 'private') {
            await bot.sendMessage(msg.chat.id, message, { 
                parse_mode: 'Markdown'
            });
        } else {
            await bot.sendMessage(
                msg.chat.id, 
                '💳 I\'ve sent your deposit address privately to avoid sharing it publicly.',
                { reply_to_message_id: msg.message_id }
            );
            
            try {
                await bot.sendMessage(telegramId, message, { 
                    parse_mode: 'Markdown'
                });
            } catch (dmError) {
                await bot.sendMessage(
                    msg.chat.id,
                    'Please start a private conversation with me first by clicking my username, then use /deposit there.',
                    { reply_to_message_id: msg.message_id }
                );
            }
        }
        
    } catch (error) {
        // Error occurred while processing deposit command
        await bot.sendMessage(
            msg.chat.id,
            MessageFormatter.formatError('Failed to get deposit address. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleDeposit };