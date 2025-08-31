const database = require('../connection');

class Balance {
    static async createOrUpdate(telegramId, tokenSymbol, network, balance) {
        const sql = `
            INSERT OR REPLACE INTO balances 
            (user_telegram_id, token_symbol, network, balance, last_updated)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        return await database.run(sql, [telegramId, tokenSymbol, network || 'BASE', balance]);
    }

    static async get(telegramId, tokenSymbol, network = 'BASE') {
        const sql = `
            SELECT * FROM balances 
            WHERE user_telegram_id = ? AND token_symbol = ? AND network = ?
        `;
        return await database.get(sql, [telegramId, tokenSymbol, network]);
    }

    static async getUserBalances(telegramId, network = 'BASE') {
        const sql = `
            SELECT * FROM balances 
            WHERE user_telegram_id = ? AND network = ?
            ORDER BY token_symbol
        `;
        return await database.all(sql, [telegramId, network]);
    }

    static async getAllUserBalances(telegramId) {
        const sql = `
            SELECT * FROM balances 
            WHERE user_telegram_id = ?
            ORDER BY network, token_symbol
        `;
        return await database.all(sql, [telegramId]);
    }

    static async updateBalance(telegramId, tokenSymbol, network, newBalance) {
        const sql = `
            UPDATE balances 
            SET balance = ?, last_updated = CURRENT_TIMESTAMP
            WHERE user_telegram_id = ? AND token_symbol = ? AND network = ?
        `;
        return await database.run(sql, [newBalance, telegramId, tokenSymbol, network || 'BASE']);
    }

    static async isBalanceCacheValid(telegramId, tokenSymbol, network = 'BASE', maxAgeMinutes = 5) {
        const sql = `
            SELECT last_updated FROM balances 
            WHERE user_telegram_id = ? AND token_symbol = ? AND network = ?
        `;
        const result = await database.get(sql, [telegramId, tokenSymbol, network]);
        
        if (!result) return false;
        
        const lastUpdated = new Date(result.last_updated);
        const now = new Date();
        const diffMinutes = (now - lastUpdated) / (1000 * 60);
        
        return diffMinutes < maxAgeMinutes;
    }
}

module.exports = Balance;