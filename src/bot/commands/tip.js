const User = require('../../database/models/User');
const Transaction = require('../../database/models/Transaction');
const Balance = require('../../database/models/Balance');
const TransactionManager = require('../../blockchain/transactions');
const Validation = require('../../utils/validation');
const rateLimiter = require('../middleware/rateLimiter');
const { MESSAGES } = require('../../utils/constants');
const MessageFormatter = require('../utils/messageFormatter');

async function handleTip(bot, msg) {
    const telegramId = msg.from.id;
    const chatId = msg.chat.id;
    const messageText = msg.text;
    
    try {
        const rateLimitCheck = await rateLimiter.middleware(telegramId, 'tip');
        if (!rateLimitCheck.allowed) {
            return bot.sendMessage(chatId, rateLimitCheck.error, {
                reply_to_message_id: msg.message_id
            });
        }
        
        const validation = Validation.parseTipCommand(messageText);
        if (!validation.valid) {
            return bot.sendMessage(chatId, MessageFormatter.formatError(validation.error), {
                reply_to_message_id: msg.message_id
            });
        }
        
        const { username, amount, tokenSymbol, tokenAddress, message } = validation.data;
        
        const dailyCheck = rateLimiter.checkDailyTipLimit(telegramId, amount);
        if (!dailyCheck.allowed) {
            return bot.sendMessage(chatId, MessageFormatter.formatError(dailyCheck.error), {
                reply_to_message_id: msg.message_id
            });
        }
        
        const fromUser = await User.findByTelegramId(telegramId);
        if (!fromUser) {
            return bot.sendMessage(chatId, 'Please /start the bot first to create your wallet.', {
                reply_to_message_id: msg.message_id
            });
        }
        
        const toUser = await User.findByUsername(username);
        if (!toUser) {
            return bot.sendMessage(
                chatId, 
                MESSAGES.USER_NOT_FOUND(username), 
                { reply_to_message_id: msg.message_id }
            );
        }
        
        if (fromUser.telegram_id === toUser.telegram_id) {
            return bot.sendMessage(chatId, MessageFormatter.formatError("You can't tip yourself!"), {
                reply_to_message_id: msg.message_id
            });
        }
        
        const transactionManager = new TransactionManager();
        const balanceCheck = await transactionManager.checkSufficientBalance(
            fromUser.wallet_address,
            amount,
            tokenSymbol
        );
        
        if (!balanceCheck.sufficient) {
            return bot.sendMessage(
                chatId,
                MESSAGES.INSUFFICIENT_FUNDS(
                    balanceCheck.currentBalance,
                    amount,
                    tokenSymbol
                ),
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const groupId = msg.chat.type !== 'private' ? chatId : null;
        const groupName = groupId ? msg.chat.title || 'Group Chat' : null;
        
        const transactionResult = await Transaction.create(
            fromUser.telegram_id,
            toUser.telegram_id,
            amount,
            tokenSymbol,
            tokenAddress,
            message,
            groupId,
            groupName
        );
        
        const processingMessage = await bot.sendMessage(
            chatId,
            '⏳ Processing tip...',
            { reply_to_message_id: msg.message_id }
        );
        
        try {
            const wallet = transactionManager.decryptWallet(
                fromUser.private_key_encrypted,
                process.env.PRIVATE_KEY_PASSWORD
            );
            
            const tipResult = await transactionManager.processTip(
                wallet,
                toUser.wallet_address,
                amount,
                tokenSymbol
            );
            
            if (tipResult.success) {
                await Transaction.updateStatus(
                    transactionResult.id,
                    'completed',
                    tipResult.txHash
                );
                
                await Balance.updateBalance(
                    fromUser.telegram_id,
                    tokenSymbol,
                    balanceCheck.currentBalance - amount
                );
                
                const toBalance = await Balance.get(toUser.telegram_id, tokenSymbol);
                const newToBalance = toBalance ? parseFloat(toBalance.balance) + amount : amount;
                await Balance.updateBalance(toUser.telegram_id, tokenSymbol, newToBalance);
                
                await bot.editMessageText(
                    MESSAGES.TIP_SUCCESS(amount, tokenSymbol, username, MessageFormatter.formatTxHash(tipResult.txHash)),
                    {
                        chat_id: chatId,
                        message_id: processingMessage.message_id,
                        parse_mode: 'Markdown'
                    }
                );
                
                try {
                    await bot.sendMessage(
                        toUser.telegram_id,
                        MESSAGES.TIP_RECEIVED(fromUser.username, amount, tokenSymbol, message)
                    );
                } catch (dmError) {
                    // Could not send DM to user
                }
                
                // Tip completed
                
            } else {
                await Transaction.updateStatus(transactionResult.id, 'failed');
                
                await bot.editMessageText(
                    MessageFormatter.formatError(`Transaction failed: ${tipResult.error}`),
                    {
                        chat_id: chatId,
                        message_id: processingMessage.message_id
                    }
                );
            }
            
        } catch (blockchainError) {
            // Blockchain error
            
            await Transaction.updateStatus(transactionResult.id, 'failed');
            
            await bot.editMessageText(
                MessageFormatter.formatError('Transaction failed. Please try again.'),
                {
                    chat_id: chatId,
                    message_id: processingMessage.message_id
                }
            );
        }
        
    } catch (error) {
        // Error in tip command
        await bot.sendMessage(
            chatId,
            MessageFormatter.formatError('Failed to process tip. Please try again.'),
            { reply_to_message_id: msg.message_id }
        );
    }
}

module.exports = { handleTip };