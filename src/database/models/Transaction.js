const database = require('../connection');

class Transaction {
    static async create(data) {
        const sql = `
            INSERT INTO transactions 
            (sender_id, recipient_id, amount, token, network, tx_hash, message, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await database.run(sql, [
            data.sender_id, data.recipient_id, data.amount, data.token, data.network, 
            data.tx_hash, data.message, data.status || 'pending'
        ]);
        return result;
    }

    static async updateStatus(id, status, txHash = null) {
        const sql = `
            UPDATE transactions 
            SET status = ?, tx_hash = ?
            WHERE id = ?
        `;
        return await database.run(sql, [status, txHash, id]);
    }

    static async findById(id) {
        const sql = 'SELECT * FROM transactions WHERE id = ?';
        return await database.get(sql, [id]);
    }

    static async getUserHistory(telegramId, limit = 10) {
        const sql = `
            SELECT * FROM transactions 
            WHERE sender_id = ? OR recipient_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `;
        return await database.all(sql, [telegramId, telegramId, limit]);
    }

    static async getRecentTransactions(telegramId, limit = 20) {
        return await this.getUserHistory(telegramId, limit);
    }

    static async getGroupStats(groupId) {
        const sql = `
            SELECT 
                COUNT(*) as total_tips,
                SUM(amount) as total_amount,
                token_symbol
            FROM transactions 
            WHERE group_id = ? AND status = 'completed'
            GROUP BY token_symbol
        `;
        return await database.all(sql, [groupId]);
    }

    static async getTopTippers(groupId, limit = 5) {
        const sql = `
            SELECT 
                u.username,
                COUNT(*) as tip_count,
                SUM(t.amount) as total_sent
            FROM transactions t
            JOIN users u ON t.from_telegram_id = u.telegram_id
            WHERE t.group_id = ? AND t.status = 'completed'
            GROUP BY t.from_telegram_id
            ORDER BY total_sent DESC
            LIMIT ?
        `;
        return await database.all(sql, [groupId, limit]);
    }

    static async getTopReceivers(groupId, limit = 5) {
        const sql = `
            SELECT 
                u.username,
                COUNT(*) as tip_count,
                SUM(t.amount) as total_received
            FROM transactions t
            JOIN users u ON t.to_telegram_id = u.telegram_id
            WHERE t.group_id = ? AND t.status = 'completed'
            GROUP BY t.to_telegram_id
            ORDER BY total_received DESC
            LIMIT ?
        `;
        return await database.all(sql, [groupId, limit]);
    }

    static async count() {
        const sql = 'SELECT COUNT(*) as count FROM transactions';
        const result = await database.get(sql);
        return result.count;
    }

    static async getTotalVolume() {
        const sql = `
            SELECT SUM(amount) as volume 
            FROM transactions 
            WHERE status = 'completed' AND token IN ('USDC', 'USDT')
        `;
        const result = await database.get(sql);
        return result.volume || 0;
    }

    static async getNetworkStats(network) {
        const sql = `
            SELECT 
                COUNT(*) as transactionCount,
                SUM(amount) as volume,
                COUNT(DISTINCT sender_id) + COUNT(DISTINCT recipient_id) as uniqueUsers,
                AVG(amount) as avgTransaction
            FROM transactions 
            WHERE network = ? AND status = 'completed'
        `;
        const result = await database.get(sql, [network]);
        return {
            transactionCount: result.transactionCount || 0,
            volume: result.volume || 0,
            uniqueUsers: result.uniqueUsers || 0,
            avgTransaction: result.avgTransaction || 0
        };
    }

    static async getUserStats(telegramId) {
        const sentSql = `
            SELECT 
                SUM(amount) as totalSent,
                COUNT(*) as sentCount
            FROM transactions 
            WHERE sender_id = ? AND status = 'completed' AND token IN ('USDC', 'USDT')
        `;
        const receivedSql = `
            SELECT 
                SUM(amount) as totalReceived,
                COUNT(*) as receivedCount
            FROM transactions 
            WHERE recipient_id = ? AND status = 'completed' AND token IN ('USDC', 'USDT')
        `;
        const contactsSql = `
            SELECT COUNT(DISTINCT 
                CASE WHEN sender_id = ? THEN recipient_id 
                     WHEN recipient_id = ? THEN sender_id END
            ) as uniqueContacts
            FROM transactions 
            WHERE (sender_id = ? OR recipient_id = ?) AND status = 'completed'
        `;

        const sent = await database.get(sentSql, [telegramId]);
        const received = await database.get(receivedSql, [telegramId]);
        const contacts = await database.get(contactsSql, [telegramId, telegramId, telegramId, telegramId]);

        return {
            totalSent: sent.totalSent || 0,
            totalReceived: received.totalReceived || 0,
            transactionCount: (sent.sentCount || 0) + (received.receivedCount || 0),
            uniqueContacts: contacts.uniqueContacts || 0
        };
    }

    static async findByHash(txHash) {
        const sql = 'SELECT * FROM transactions WHERE tx_hash = ?';
        return await database.get(sql, [txHash]);
    }

    static async getGroupStats(chatId) {
        // This would need group_id field in transactions table
        // For now return empty stats
        return {
            totalTips: 0,
            totalVolume: 0,
            topTippers: [],
            topReceivers: []
        };
    }
}

module.exports = Transaction;