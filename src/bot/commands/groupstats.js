const Transaction = require('../../database/models/Transaction');
const MessageFormatter = require('../utils/messageFormatter');

async function handleGroupStats(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        if (msg.chat.type === 'private') {
            return bot.sendMessage(
                chatId,
                'This command only works in group chats.',
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const stats = await Transaction.getGroupStats(chatId);
        const message = MessageFormatter.formatGroupStats(stats);
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing groupstats command
        await bot.sendMessage(
            chatId,
            MessageFormatter.formatError('Failed to get group stats. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

async function handleTippers(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        if (msg.chat.type === 'private') {
            return bot.sendMessage(
                chatId,
                'This command only works in group chats.',
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const topTippers = await Transaction.getTopTippers(chatId, 5);
        const message = MessageFormatter.formatLeaderboard(
            'Top Tippers This Week',
            topTippers,
            'total_sent',
            'USD sent'
        );
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing tippers command
        await bot.sendMessage(
            chatId,
            MessageFormatter.formatError('Failed to get top tippers. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

async function handleReceivers(bot, msg) {
    const chatId = msg.chat.id;
    
    try {
        if (msg.chat.type === 'private') {
            return bot.sendMessage(
                chatId,
                'This command only works in group chats.',
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const topReceivers = await Transaction.getTopReceivers(chatId, 5);
        const message = MessageFormatter.formatLeaderboard(
            'Top Receivers This Week',
            topReceivers,
            'total_received',
            'USD received'
        );
        
        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id
        });
        
    } catch (error) {
        // Error occurred while processing receivers command
        await bot.sendMessage(
            chatId,
            MessageFormatter.formatError('Failed to get top receivers. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleGroupStats, handleTippers, handleReceivers };