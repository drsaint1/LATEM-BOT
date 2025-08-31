const { MESSAGES, NETWORKS } = require('../../utils/constants');

class MessageFormatter {
    static formatBalance(balances) {
        if (!balances || balances.length === 0) {
            return '💰 **Your Balances:**\n\nNo tokens found. Use /deposit to fund your wallet.';
        }
        
        // Group balances by network
        const networkBalances = {};
        balances.forEach(balance => {
            if (!networkBalances[balance.network]) {
                networkBalances[balance.network] = [];
            }
            networkBalances[balance.network].push(balance);
        });
        
        let message = '💰 **Your Balances:**\n\n';
        
        // Show balances for each network
        for (const [networkName, networkTokens] of Object.entries(networkBalances)) {
            const networkInfo = NETWORKS[networkName];
            if (networkInfo) {
                message += `🌐 **${networkInfo.NAME}:**\n`;
                
                networkTokens.forEach(balance => {
                    const amount = parseFloat(balance.balance).toFixed(8).replace(/\.?0+$/, '');
                    if (parseFloat(amount) > 0) {
                        message += `  ${balance.token_symbol}: ${amount}\n`;
                    }
                });
                message += '\n';
            }
        }
        
        message += 'Use /deposit to add funds • /network to switch networks';
        
        return message;
    }

    static formatHistory(transactions, currentUserId) {
        if (!transactions || transactions.length === 0) {
            return '📝 **Transaction History:**\n\nNo transactions found.';
        }
        
        let message = '📝 **Recent Transactions:**\n\n';
        
        transactions.slice(0, 10).forEach(tx => {
            const date = new Date(tx.created_at).toLocaleDateString();
            const amount = parseFloat(tx.amount).toFixed(8).replace(/\.?0+$/, '');
            const isOutgoing = tx.from_telegram_id === currentUserId;
            const direction = isOutgoing ? '↗️ Sent' : '↙️ Received';
            const status = tx.status === 'completed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';
            
            message += `${status} ${direction} ${amount} ${tx.token_symbol}\n`;
            message += `    ${date}`;
            
            if (tx.message) {
                message += ` - "${tx.message}"`;
            }
            
            message += '\n\n';
        });
        
        return message.trim();
    }

    static formatGroupStats(stats) {
        if (!stats || stats.length === 0) {
            return '📊 **Group Stats:**\n\nNo tips yet in this group!';
        }
        
        let message = '📊 **Group Tipping Stats:**\n\n';
        
        stats.forEach(stat => {
            const totalAmount = parseFloat(stat.total_amount).toFixed(2);
            message += `${stat.token_symbol}: ${stat.total_tips} tips, $${totalAmount}\n`;
        });
        
        return message;
    }

    static formatLeaderboard(title, users, valueKey, valueLabel) {
        if (!users || users.length === 0) {
            return `🏆 **${title}:**\n\nNo data available yet!`;
        }
        
        let message = `🏆 **${title}:**\n\n`;
        
        users.forEach((user, index) => {
            const position = index + 1;
            const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';
            const value = parseFloat(user[valueKey]).toFixed(2);
            
            message += `${emoji} ${position}. @${user.username}\n`;
            message += `    ${value} ${valueLabel}\n\n`;
        });
        
        return message.trim();
    }

    static formatUserStats(user, sentCount, receivedCount) {
        const totalSent = parseFloat(user.total_sent || 0).toFixed(2);
        const totalReceived = parseFloat(user.total_received || 0).toFixed(2);
        
        return `📈 **Your Stats:**

💸 **Sent:** $${totalSent} (${sentCount} tips)
💰 **Received:** $${totalReceived} (${receivedCount} tips)
📅 **Member since:** ${new Date(user.created_at).toLocaleDateString()}

Keep tipping! 🚀`;
    }

    static formatDepositInfo(walletAddress) {
        return `💳 **Your Deposit Address:**

\`${walletAddress}\`

**Supported Networks:**
• Base Sepolia Testnet only  
• Supported tokens: USDC, USDT, ETH

⚠️ **Important:** Only send supported tokens to this address on Base Sepolia testnet. Tokens sent on other networks will be lost.

Your balance will update automatically after deposits are confirmed.`;
    }

    static formatError(error) {
        if (typeof error === 'string') {
            return `❌ ${error}`;
        }
        
        return '❌ Something went wrong. Please try again.';
    }

    static formatSuccess(message) {
        return `✅ ${message}`;
    }

    static formatWarning(message) {
        return `⚠️ ${message}`;
    }

    static formatTxHash(txHash) {
        if (!txHash) return '';
        
        const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
        return `[${shortHash}](https://sepolia.basescan.org/tx/${txHash})`;
    }

    static escapeMarkdown(text) {
        if (typeof text !== 'string') return text;
        
        return text
            .replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
    }

    static formatSplitCalculation(amount, participants) {
        const perPerson = (amount / participants).toFixed(2);
        
        let message = `💰 **Bill Split Calculator:**\n\n`;
        message += `Total: $${amount}\n`;
        message += `Participants: ${participants}\n`;
        message += `**Per person: $${perPerson}**\n\n`;
        message += `Tip each person with:\n`;
        message += `/tip @username ${perPerson} USDC`;
        
        return message;
    }
}

module.exports = MessageFormatter;