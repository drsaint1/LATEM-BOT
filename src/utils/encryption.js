const crypto = require('crypto');

class Encryption {
    static algorithm = 'aes-256-cbc';
    
    static encryptPrivateKey(privateKey, password) {
        try {
            const salt = crypto.randomBytes(32);
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            let encrypted = cipher.update(privateKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const result = {
                salt: salt.toString('hex'),
                iv: iv.toString('hex'),
                encrypted: encrypted
            };
            
            return JSON.stringify(result);
        } catch (error) {
            throw new Error('Failed to encrypt private key: ' + error.message);
        }
    }
    
    static decryptPrivateKey(encryptedData, password) {
        try {
            const data = JSON.parse(encryptedData);
            const salt = Buffer.from(data.salt, 'hex');
            const iv = Buffer.from(data.iv, 'hex');
            
            const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            
            let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt private key: ' + error.message);
        }
    }
    
    static generateSecurePassword() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = Encryption;