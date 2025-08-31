const { MESSAGES } = require('../../utils/constants');
const MessageFormatter = require('../utils/messageFormatter');

async function handleHelp(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        await bot.sendMessage(chatId, MESSAGES.HELP, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing help command
        await bot.sendMessage(
            chatId,
            MessageFormatter.formatError('Failed to show help. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

async function handleSplit(bot, msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;
    
    try {
        const regex = /^\/split\s+(\d+(?:\.\d+)?)\s+(\d+)$/i;
        const match = messageText.trim().match(regex);
        
        if (!match) {
            return bot.sendMessage(
                chatId,
                MessageFormatter.formatError('Invalid format. Use: /split amount participants\nExample: /split 50 4'),
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const [, amount, participants] = match;
        const amountNum = parseFloat(amount);
        const participantsNum = parseInt(participants);
        
        if (amountNum <= 0) {
            return bot.sendMessage(
                chatId,
                MessageFormatter.formatError('Amount must be positive.'),
                { reply_to_message_id: msg.message_id }
            );
        }
        
        if (participantsNum <= 1) {
            return bot.sendMessage(
                chatId,
                MessageFormatter.formatError('Need at least 2 participants.'),
                { reply_to_message_id: msg.message_id }
            );
        }
        
        if (participantsNum > 20) {
            return bot.sendMessage(
                chatId,
                MessageFormatter.formatError('Too many participants (max 20).'),
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const message = MessageFormatter.formatSplitCalculation(amountNum, participantsNum);
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing split command
        await bot.sendMessage(
            chatId,
            MessageFormatter.formatError('Failed to calculate split. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleHelp, handleSplit };