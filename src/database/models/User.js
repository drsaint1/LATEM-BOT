const database = require('../connection');

class User {
    static async create(telegramId, username, walletAddress, privateKeyEncrypted) {
        const sql = `
            INSERT INTO users (telegram_id, username, wallet_address, private_key_encrypted)
            VALUES (?, ?, ?, ?)
        `;
        const result = await database.run(sql, [telegramId, username, walletAddress, privateKeyEncrypted]);
        return result;
    }

    static async findByTelegramId(telegramId) {
        const sql = 'SELECT * FROM users WHERE telegram_id = ?';
        return await database.get(sql, [telegramId]);
    }

    static async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        return await database.get(sql, [username]);
    }

    static async updateTotals(telegramId, totalSent, totalReceived) {
        const sql = `
            UPDATE users 
            SET total_sent = ?, total_received = ?
            WHERE telegram_id = ?
        `;
        return await database.run(sql, [totalSent, totalReceived, telegramId]);
    }

    static async exists(telegramId) {
        const user = await this.findByTelegramId(telegramId);
        return user !== undefined;
    }

    static async findById(telegramId) {
        return await this.findByTelegramId(telegramId);
    }

    static async count() {
        const sql = 'SELECT COUNT(*) as count FROM users';
        const result = await database.get(sql);
        return result.count;
    }

    static async updatePreferredNetwork(telegramId, network) {
        const sql = `
            UPDATE users 
            SET preferred_network = ?
            WHERE telegram_id = ?
        `;
        return await database.run(sql, [network, telegramId]);
    }
}

module.exports = User;