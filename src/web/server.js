const express = require('express');
const path = require('path');
const cors = require('cors');
const User = require('../database/models/User');
const Transaction = require('../database/models/Transaction');
const Balance = require('../database/models/Balance');
const WalletManager = require('../blockchain/wallet');
const { NETWORKS, TOKENS } = require('../utils/constants');

const app = express();
const PORT = process.env.PORT || 3000;
const walletManager = new WalletManager();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Get user dashboard data
app.get('/api/user/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const user = await User.findById(telegramId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get balances across all networks
        const balances = {};
        const network = user.preferred_network || 'BASE';
        
        for (const [networkName, networkInfo] of Object.entries(NETWORKS)) {
            balances[networkName] = {};
            const tokens = TOKENS[networkName];
            
            if (tokens) {
                for (const [tokenSymbol, tokenInfo] of Object.entries(tokens)) {
                    try {
                        const balance = await walletManager.getWalletBalance(
                            user.wallet_address,
                            tokenInfo.address === 'native' ? null : tokenInfo.address,
                            networkName,
                            tokenInfo.decimals
                        );
                        balances[networkName][tokenSymbol] = parseFloat(balance).toFixed(6);
                    } catch (error) {
                        balances[networkName][tokenSymbol] = '0.000000';
                    }
                }
            }
        }

        // Get recent transactions
        const transactions = await Transaction.getRecentTransactions(telegramId, 20);
        
        // Get user stats
        const stats = await Transaction.getUserStats(telegramId);

        res.json({
            user: {
                telegramId: user.telegram_id,
                username: user.username,
                walletAddress: user.wallet_address,
                preferredNetwork: network,
                createdAt: user.created_at
            },
            balances,
            transactions,
            stats
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get network statistics
app.get('/api/network/stats', async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.count(),
            totalTransactions: await Transaction.count(),
            totalVolume: await Transaction.getTotalVolume(),
            networkBreakdown: {}
        };

        // Get transaction breakdown by network
        for (const networkName of Object.keys(NETWORKS)) {
            const networkStats = await Transaction.getNetworkStats(networkName);
            stats.networkBreakdown[networkName] = networkStats;
        }

        res.json(stats);
    } catch (error) {
        console.error('Network stats API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get group analytics
app.get('/api/group/:chatId/stats', async (req, res) => {
    try {
        const { chatId } = req.params;
        const stats = await Transaction.getGroupStats(chatId);
        res.json(stats);
    } catch (error) {
        console.error('Group stats API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboards
app.get('/api/leaderboard/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        let leaderboard;
        if (type === 'tippers') {
            leaderboard = await Transaction.getTopTippers(limit);
        } else if (type === 'receivers') {
            leaderboard = await Transaction.getTopReceivers(limit);
        } else {
            return res.status(400).json({ error: 'Invalid leaderboard type' });
        }
        
        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get transaction details
app.get('/api/transaction/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;
        const transaction = await Transaction.findByHash(txHash);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Get sender and recipient info
        const sender = await User.findById(transaction.sender_id);
        const recipient = await User.findById(transaction.recipient_id);

        res.json({
            ...transaction,
            sender: sender ? { username: sender.username, address: sender.wallet_address } : null,
            recipient: recipient ? { username: recipient.username, address: recipient.wallet_address } : null
        });
    } catch (error) {
        console.error('Transaction API error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve user dashboard
app.get('/user/:telegramId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Web dashboard running on port ${PORT}`);
    });
}

module.exports = app;