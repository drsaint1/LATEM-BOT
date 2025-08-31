const User = require('../../database/models/User');
const Transaction = require('../../database/models/Transaction');
const WalletManager = require('../../blockchain/wallet');
const TransactionManager = require('../../blockchain/transactions');
const { NETWORKS, TOKENS, LIMITS } = require('../../utils/constants');
const { parseAmount } = require('../../utils/validation');

const walletManager = new WalletManager();
const transactionManager = new TransactionManager();

async function handleSplitCommand(bot, msg) {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    try {
        if (args.length < 3) {
            return bot.sendMessage(chatId, 
                `💡 **Bill Splitting Commands:**\n\n` +
                `**Auto Split:**\n` +
                `/split <total> @user1 @user2 [token] [description]\n` +
                `Example: /split 60 @alice @bob USDC dinner\n\n` +
                `**Manual Split:**\n` +
                `/split <total> <people_count> [token] [description]\n` +
                `Example: /split 60 4 USDC dinner\n\n` +
                `**Calculate Only:**\n` +
                `/split calc <total> <people_count>\n` +
                `Example: /split calc 87.50 3`
            );
        }

        // Check if it's a calculation-only request
        if (args[0].toLowerCase() === 'calc') {
            if (args.length < 3) {
                return bot.sendMessage(chatId, '❌ Usage: /split calc <total> <people_count>');
            }
            
            const total = parseFloat(args[1]);
            const peopleCount = parseInt(args[2]);
            
            if (!total || !peopleCount || peopleCount < 2) {
                return bot.sendMessage(chatId, '❌ Invalid total amount or people count');
            }
            
            const perPerson = total / peopleCount;
            return bot.sendMessage(chatId, 
                `🧮 **Bill Split Calculator**\n\n` +
                `💰 Total: $${total.toFixed(2)}\n` +
                `👥 People: ${peopleCount}\n` +
                `💸 Per person: $${perPerson.toFixed(2)}\n\n` +
                `Use /split ${total} @user1 @user2... to send payments`
            );
        }

        const totalAmount = parseAmount(args[0]);
        if (!totalAmount) {
            return bot.sendMessage(chatId, '❌ Invalid total amount format');
        }

        let recipients = [];
        let peopleCount = 0;
        let token = 'USDC';
        let description = '';
        let argIndex = 1;

        // Parse recipients or people count
        if (args[argIndex].startsWith('@')) {
            // Auto split mode - extract usernames
            while (argIndex < args.length && args[argIndex].startsWith('@')) {
                recipients.push(args[argIndex].substring(1));
                argIndex++;
            }
            peopleCount = recipients.length + 1; // +1 for the sender
        } else {
            // Manual split mode - get people count
            peopleCount = parseInt(args[argIndex]);
            if (!peopleCount || peopleCount < 2) {
                return bot.sendMessage(chatId, '❌ People count must be at least 2');
            }
            argIndex++;
        }

        // Parse token if provided
        if (argIndex < args.length && ['USDC', 'USDT', 'ETH', 'MATIC'].includes(args[argIndex].toUpperCase())) {
            token = args[argIndex].toUpperCase();
            argIndex++;
        }

        // Parse description
        if (argIndex < args.length) {
            description = args.slice(argIndex).join(' ');
        }

        const perPersonAmount = totalAmount / peopleCount;

        // If manual split, just show calculation
        if (recipients.length === 0) {
            return bot.sendMessage(chatId, 
                `🧮 **Bill Split Calculation**\n\n` +
                `💰 Total: ${totalAmount} ${token}\n` +
                `👥 People: ${peopleCount}\n` +
                `💸 Per person: ${perPersonAmount.toFixed(6)} ${token}\n` +
                `${description ? `📝 Description: ${description}\n` : ''}` +
                `\nTo send payments, use:\n/split ${totalAmount} @user1 @user2... ${token}${description ? ` ${description}` : ''}`
            );
        }

        // Auto split mode - validate sender
        const sender = await User.findById(senderId);
        if (!sender) {
            return bot.sendMessage(chatId, '❌ Please /start the bot first to create your wallet.');
        }

        const network = sender.preferred_network || 'BASE';
        const tokenInfo = TOKENS[network][token];
        if (!tokenInfo) {
            return bot.sendMessage(chatId, `❌ Token ${token} not supported on ${network}`);
        }

        // Validate recipients exist
        const recipientUsers = [];
        for (const username of recipients) {
            const recipient = await User.findByUsername(username);
            if (!recipient) {
                return bot.sendMessage(chatId, `❌ User @${username} not found. They need to /start the bot first.`);
            }
            recipientUsers.push(recipient);
        }

        // Check limits
        const senderShare = perPersonAmount;
        if (senderShare > LIMITS.MAX_TIP_AMOUNT) {
            return bot.sendMessage(chatId, `❌ Per person amount (${senderShare.toFixed(2)}) exceeds maximum tip limit ($${LIMITS.MAX_TIP_AMOUNT})`);
        }

        // Calculate how much sender needs to pay (their share + covering others)
        const senderPayment = totalAmount - senderShare; // Sender pays for others, gets their share "for free"

        // Check sender balance
        const senderWallet = walletManager.decryptWallet(sender.encrypted_private_key, process.env.PRIVATE_KEY_PASSWORD, network);
        const balance = await walletManager.getWalletBalance(
            senderWallet.address, 
            tokenInfo.address === 'native' ? null : tokenInfo.address,
            network,
            tokenInfo.decimals
        );

        if (parseFloat(balance) < senderPayment) {
            return bot.sendMessage(chatId, 
                `❌ Insufficient balance. You need ${senderPayment.toFixed(6)} ${token} to cover the split.\n` +
                `Your balance: ${balance} ${token}`
            );
        }

        // Send confirmation and process payments
        const confirmMsg = await bot.sendMessage(chatId, 
            `🧾 **Processing Bill Split**\n\n` +
            `💰 Total: ${totalAmount} ${token}\n` +
            `👥 People: ${peopleCount} (including you)\n` +
            `💸 Per person: ${perPersonAmount.toFixed(6)} ${token}\n` +
            `${description ? `📝 ${description}\n` : ''}` +
            `\n🔄 Sending payments...`
        );

        // Process payments to each recipient
        const results = [];
        for (let i = 0; i < recipientUsers.length; i++) {
            const recipient = recipientUsers[i];
            const recipientUsername = recipients[i];
            
            try {
                const recipientWallet = walletManager.decryptWallet(recipient.encrypted_private_key, process.env.PRIVATE_KEY_PASSWORD, network);
                
                const txHash = await transactionManager.sendTransaction(
                    senderWallet,
                    recipientWallet.address,
                    perPersonAmount.toString(),
                    tokenInfo.address === 'native' ? null : tokenInfo.address,
                    tokenInfo.decimals,
                    network
                );

                await Transaction.create({
                    sender_id: senderId,
                    recipient_id: recipient.telegram_id,
                    amount: perPersonAmount,
                    token: token,
                    network: network,
                    tx_hash: txHash,
                    message: `Bill split${description ? `: ${description}` : ''}`,
                    status: 'completed'
                });

                results.push({ username: recipientUsername, success: true, txHash });

                // Notify recipient
                try {
                    await bot.sendMessage(recipient.telegram_id, 
                        `🧾 Bill split payment from @${msg.from.username || msg.from.first_name}\n\n` +
                        `💰 Your share: ${perPersonAmount.toFixed(6)} ${token}\n` +
                        `📊 Total bill: ${totalAmount} ${token} ÷ ${peopleCount} people\n` +
                        `${description ? `📝 ${description}\n` : ''}` +
                        `🌐 Network: ${NETWORKS[network].NAME}\n` +
                        `🔗 Transaction: ${NETWORKS[network].EXPLORER}/tx/${txHash}`
                    );
                } catch (notifyError) {
                    // Failed to notify recipient via DM
                }

            } catch (error) {
                // Split payment failed for recipient
                results.push({ username: recipientUsername, success: false, error: error.message });
            }
        }

        // Send final results
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        let resultMessage = `✅ **Bill Split Complete**\n\n`;
        resultMessage += `💰 Total: ${totalAmount} ${token}\n`;
        resultMessage += `👥 Split ${peopleCount} ways: ${perPersonAmount.toFixed(6)} ${token} each\n`;
        resultMessage += `${description ? `📝 ${description}\n` : ''}`;
        resultMessage += `\n**Payments sent (${successful.length}/${recipients.length}):**\n`;
        
        successful.forEach(result => {
            resultMessage += `✅ @${result.username}: ${perPersonAmount.toFixed(6)} ${token}\n`;
        });

        if (failed.length > 0) {
            resultMessage += `\n❌ **Failed:**\n`;
            failed.forEach(result => {
                resultMessage += `• @${result.username}: ${result.error}\n`;
            });
        }

        resultMessage += `\n🏦 You paid: ${senderPayment.toFixed(6)} ${token}`;
        resultMessage += `\n🌐 Network: ${NETWORKS[network].NAME}`;

        await bot.editMessageText(resultMessage, {
            chat_id: chatId,
            message_id: confirmMsg.message_id
        });

    } catch (error) {
        // Error occurred while processing split command
        bot.sendMessage(chatId, '❌ Bill split failed. Please try again.');
    }
}

module.exports = handleSplitCommand;