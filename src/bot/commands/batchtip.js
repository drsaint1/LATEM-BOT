const User = require('../../database/models/User');
const Transaction = require('../../database/models/Transaction');
const WalletManager = require('../../blockchain/wallet');
const TransactionManager = require('../../blockchain/transactions');
const { NETWORKS, TOKENS, LIMITS } = require('../../utils/constants');
const { parseAmount } = require('../../utils/validation');

const walletManager = new WalletManager();
const transactionManager = new TransactionManager();

async function handleBatchTipCommand(bot, msg) {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    try {
        if (args.length < 3) {
            return bot.sendMessage(chatId, 
                `❌ Usage: /batchtip @user1 @user2 @user3 <amount> <token> [message]\n` +
                `Example: /batchtip @alice @bob 5 USDC lunch split`
            );
        }

        const recipients = [];
        let amountIndex = 0;
        
        // Parse recipients (usernames starting with @)
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('@')) {
                recipients.push(args[i].substring(1));
            } else {
                amountIndex = i;
                break;
            }
        }

        if (recipients.length === 0) {
            return bot.sendMessage(chatId, '❌ Please specify at least one recipient with @username');
        }

        if (recipients.length > 10) {
            return bot.sendMessage(chatId, '❌ Maximum 10 recipients per batch tip');
        }

        const amount = args[amountIndex];
        const token = (args[amountIndex + 1] || 'USDC').toUpperCase();
        const message = args.slice(amountIndex + 2).join(' ');

        const parsedAmount = parseAmount(amount);
        if (!parsedAmount) {
            return bot.sendMessage(chatId, '❌ Invalid amount format');
        }

        // Get sender info
        const sender = await User.findById(senderId);
        if (!sender) {
            return bot.sendMessage(chatId, '❌ Please /start the bot first to create your wallet.');
        }

        const network = sender.preferred_network || 'BASE';
        const tokenInfo = TOKENS[network][token];
        if (!tokenInfo) {
            return bot.sendMessage(chatId, `❌ Token ${token} not supported on ${network}`);
        }

        // Validate all recipients exist
        const recipientUsers = [];
        for (const username of recipients) {
            const recipient = await User.findByUsername(username);
            if (!recipient) {
                return bot.sendMessage(chatId, `❌ User @${username} not found. They need to /start the bot first.`);
            }
            recipientUsers.push(recipient);
        }

        // Calculate total amount needed
        const totalAmount = parsedAmount * recipients.length;
        
        // Check limits
        if (parsedAmount > LIMITS.MAX_TIP_AMOUNT) {
            return bot.sendMessage(chatId, `❌ Maximum tip amount is $${LIMITS.MAX_TIP_AMOUNT}`);
        }

        // Check balance
        const senderWallet = walletManager.decryptWallet(sender.encrypted_private_key, process.env.PRIVATE_KEY_PASSWORD, network);
        const balance = await walletManager.getWalletBalance(
            senderWallet.address, 
            tokenInfo.address === 'native' ? null : tokenInfo.address,
            network,
            tokenInfo.decimals
        );

        if (parseFloat(balance) < totalAmount) {
            return bot.sendMessage(chatId, 
                `❌ Insufficient balance. You have ${balance} ${token}, need ${totalAmount} ${token} for batch tip.`
            );
        }

        // Send confirmation message
        const confirmMsg = await bot.sendMessage(chatId, 
            `🔄 Processing batch tip of ${parsedAmount} ${token} each to ${recipients.length} users...\n` +
            `Total: ${totalAmount} ${token}`
        );

        // Process each tip
        const results = [];
        for (let i = 0; i < recipientUsers.length; i++) {
            const recipient = recipientUsers[i];
            const recipientUsername = recipients[i];
            
            try {
                // Update progress
                if (i > 0) {
                    await bot.editMessageText(
                        `🔄 Processing batch tip... (${i}/${recipients.length} completed)\n` +
                        `Sending ${parsedAmount} ${token} to @${recipientUsername}...`,
                        { chat_id: chatId, message_id: confirmMsg.message_id }
                    );
                }

                const recipientWallet = walletManager.decryptWallet(recipient.encrypted_private_key, process.env.PRIVATE_KEY_PASSWORD, network);
                
                const txHash = await transactionManager.sendTransaction(
                    senderWallet,
                    recipientWallet.address,
                    parsedAmount.toString(),
                    tokenInfo.address === 'native' ? null : tokenInfo.address,
                    tokenInfo.decimals,
                    network
                );

                await Transaction.create({
                    sender_id: senderId,
                    recipient_id: recipient.telegram_id,
                    amount: parsedAmount,
                    token: token,
                    network: network,
                    tx_hash: txHash,
                    message: message,
                    status: 'completed'
                });

                results.push({ username: recipientUsername, success: true, txHash });

                // Notify recipient
                if (recipient.telegram_id !== senderId) {
                    try {
                        await bot.sendMessage(recipient.telegram_id, 
                            `🎉 @${msg.from.username || msg.from.first_name} sent you ${parsedAmount} ${token}${message ? `: "${message}"` : '!'}\n` +
                            `Network: ${NETWORKS[network].NAME}\n` +
                            `Transaction: ${NETWORKS[network].EXPLORER}/tx/${txHash}`
                        );
                    } catch (notifyError) {
                        // Failed to notify recipient via DM
                    }
                }

            } catch (error) {
                // Batch tip failed for recipient
                results.push({ username: recipientUsername, success: false, error: error.message });
            }
        }

        // Send final results
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        let resultMessage = `✅ **Batch Tip Complete**\n\n`;
        resultMessage += `**Successful (${successful.length}/${recipients.length}):**\n`;
        
        successful.forEach(result => {
            resultMessage += `• @${result.username}: ${parsedAmount} ${token}\n`;
        });

        if (failed.length > 0) {
            resultMessage += `\n❌ **Failed (${failed.length}):**\n`;
            failed.forEach(result => {
                resultMessage += `• @${result.username}: ${result.error}\n`;
            });
        }

        resultMessage += `\n💰 Total sent: ${successful.length * parsedAmount} ${token}`;
        resultMessage += `\n🌐 Network: ${NETWORKS[network].NAME}`;

        await bot.editMessageText(resultMessage, {
            chat_id: chatId,
            message_id: confirmMsg.message_id
        });

    } catch (error) {
        // Error occurred while processing batch tip
        bot.sendMessage(chatId, '❌ Batch tip failed. Please try again.');
    }
}

module.exports = handleBatchTipCommand;