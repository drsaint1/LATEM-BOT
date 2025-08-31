const User = require('../../database/models/User');
const Transaction = require('../../database/models/Transaction');
const Balance = require('../../database/models/Balance');
const TransactionManager = require('../../blockchain/transactions');
const Validation = require('../../utils/validation');
const { MESSAGES } = require('../../utils/constants');
const MessageFormatter = require('../utils/messageFormatter');

async function handleWithdraw(bot, msg) {
    const telegramId = msg.from.id;
    const messageText = msg.text;
    
    try {
        if (msg.chat.type !== 'private') {
            return bot.sendMessage(
                msg.chat.id,
                '🔒 For security, withdrawals can only be done in private chat. Please message me directly.',
                { reply_to_message_id: msg.message_id }
            );
        }
        
        const validation = Validation.parseWithdrawCommand(messageText);
        if (!validation.valid) {
            return bot.sendMessage(msg.chat.id, MessageFormatter.formatError(validation.error));
        }
        
        const { tokenSymbol, tokenAddress, amount, address } = validation.data;
        
        const user = await User.findByTelegramId(telegramId);
        if (!user) {
            return bot.sendMessage(msg.chat.id, 'Please /start the bot first to create your wallet.');
        }
        
        const transactionManager = new TransactionManager();
        const balanceCheck = await transactionManager.checkSufficientBalance(
            user.wallet_address,
            amount,
            tokenSymbol
        );
        
        if (!balanceCheck.sufficient) {
            return bot.sendMessage(
                msg.chat.id,
                MESSAGES.INSUFFICIENT_FUNDS(
                    balanceCheck.currentBalance,
                    amount,
                    tokenSymbol
                )
            );
        }
        
        const gasEstimate = await transactionManager.estimateTransactionCost(
            user.wallet_address,
            address,
            amount,
            tokenSymbol
        );
        
        if (gasEstimate.error) {
            return bot.sendMessage(
                msg.chat.id,
                MessageFormatter.formatError('Failed to estimate gas cost. Please try again.')
            );
        }
        
        const confirmationMessage = `🔄 **Withdrawal Confirmation:**

Amount: ${amount} ${tokenSymbol}
To: ${address}
Gas fee: ~${parseFloat(gasEstimate.gasCostEth).toFixed(6)} ETH

Reply with "CONFIRM" to proceed or "CANCEL" to abort.`;
        
        await bot.sendMessage(msg.chat.id, confirmationMessage, { parse_mode: 'Markdown' });
        
        const confirmationFilter = (confirmMsg) => {
            return confirmMsg.from.id === telegramId && 
                   confirmMsg.chat.id === msg.chat.id &&
                   confirmMsg.text &&
                   ['CONFIRM', 'CANCEL'].includes(confirmMsg.text.toUpperCase());
        };
        
        try {
            const confirmationResponse = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    bot.removeListener('message', messageHandler);
                    reject(new Error('timeout'));
                }, 60000);
                
                const messageHandler = (confirmMsg) => {
                    if (confirmationFilter(confirmMsg)) {
                        clearTimeout(timeout);
                        bot.removeListener('message', messageHandler);
                        resolve(confirmMsg);
                    }
                };
                
                bot.on('message', messageHandler);
            });
            
            if (confirmationResponse.text.toUpperCase() === 'CANCEL') {
                return bot.sendMessage(msg.chat.id, '❌ Withdrawal cancelled.');
            }
            
            if (confirmationResponse.text.toUpperCase() === 'CONFIRM') {
                const processingMessage = await bot.sendMessage(msg.chat.id, '⏳ Processing withdrawal...');
                
                try {
                    const wallet = transactionManager.decryptWallet(
                        user.private_key_encrypted,
                        process.env.PRIVATE_KEY_PASSWORD
                    );
                    
                    const withdrawalResult = await transactionManager.processTip(
                        wallet,
                        address,
                        amount,
                        tokenSymbol
                    );
                    
                    if (withdrawalResult.success) {
                        await Balance.updateBalance(
                            user.telegram_id,
                            tokenSymbol,
                            balanceCheck.currentBalance - amount
                        );
                        
                        await bot.editMessageText(
                            MESSAGES.WITHDRAWAL_SUCCESS(
                                amount, 
                                tokenSymbol, 
                                address, 
                                MessageFormatter.formatTxHash(withdrawalResult.txHash)
                            ),
                            {
                                chat_id: msg.chat.id,
                                message_id: processingMessage.message_id,
                                parse_mode: 'Markdown'
                            }
                        );
                        
                        // Withdrawal transaction completed successfully
                        
                    } else {
                        await bot.editMessageText(
                            MessageFormatter.formatError(`Withdrawal failed: ${withdrawalResult.error}`),
                            {
                                chat_id: msg.chat.id,
                                message_id: processingMessage.message_id
                            }
                        );
                    }
                    
                } catch (blockchainError) {
                    // Blockchain error during withdrawal processing
                    await bot.editMessageText(
                        MessageFormatter.formatError('Withdrawal failed. Please try again.'),
                        {
                            chat_id: msg.chat.id,
                            message_id: processingMessage.message_id
                        }
                    );
                }
            }
            
        } catch (timeoutError) {
            await bot.sendMessage(msg.chat.id, '⏰ Withdrawal confirmation timed out. Please try again.');
        }
        
    } catch (error) {
        // Error occurred while processing withdraw command
        await bot.sendMessage(
            msg.chat.id,
            MessageFormatter.formatError('Failed to process withdrawal. Please try again.')
        );
    }
}

module.exports = { handleWithdraw };