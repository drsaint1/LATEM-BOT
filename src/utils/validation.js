const { ethers } = require('ethers');

class Validation {
    static supportedTokens = {
        'USDC': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        'USDT': '0xf175520C52418dfE19C8098071a252da48Cd1C19',
        'ETH': 'native'
    };

    static validateAmount(amount) {
        if (typeof amount !== 'number' && typeof amount !== 'string') {
            return { valid: false, error: 'Amount must be a number' };
        }
        
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount)) {
            return { valid: false, error: 'Invalid amount format' };
        }
        
        if (numAmount <= 0) {
            return { valid: false, error: 'Amount must be positive' };
        }
        
        if (numAmount > 100) {
            return { valid: false, error: 'Amount exceeds maximum limit of $100 per tip' };
        }
        
        if (numAmount.toString().split('.')[1]?.length > 8) {
            return { valid: false, error: 'Too many decimal places (max 8)' };
        }
        
        return { valid: true, amount: numAmount };
    }

    static validateTokenSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') {
            return { valid: false, error: 'Token symbol is required' };
        }
        
        const upperSymbol = symbol.toUpperCase();
        
        if (!this.supportedTokens[upperSymbol]) {
            return { 
                valid: false, 
                error: `Unsupported token. Supported tokens: ${Object.keys(this.supportedTokens).join(', ')}` 
            };
        }
        
        return { 
            valid: true, 
            symbol: upperSymbol,
            address: this.supportedTokens[upperSymbol]
        };
    }

    static validateEthereumAddress(address) {
        if (!address || typeof address !== 'string') {
            return { valid: false, error: 'Address is required' };
        }
        
        try {
            const isValid = ethers.isAddress(address);
            if (!isValid) {
                return { valid: false, error: 'Invalid Ethereum address format' };
            }
            
            return { valid: true, address: ethers.getAddress(address) };
        } catch (error) {
            return { valid: false, error: 'Invalid Ethereum address format' };
        }
    }

    static validateTelegramUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }
        
        let cleanUsername = username.replace('@', '');
        
        if (!/^[a-zA-Z0-9_]{5,32}$/.test(cleanUsername)) {
            return { 
                valid: false, 
                error: 'Invalid username format. Must be 5-32 characters, letters, numbers, and underscores only' 
            };
        }
        
        return { valid: true, username: cleanUsername };
    }

    static validateMessage(message) {
        if (!message) {
            return { valid: true, message: '' };
        }
        
        if (typeof message !== 'string') {
            return { valid: false, error: 'Message must be text' };
        }
        
        if (message.length > 200) {
            return { valid: false, error: 'Message too long (max 200 characters)' };
        }
        
        const sanitized = message.trim().replace(/[<>]/g, '');
        
        return { valid: true, message: sanitized };
    }

    static parseTipCommand(text) {
        const regex = /^\/tip\s+@?(\w+)\s+(\d+(?:\.\d+)?)\s+(\w+)(?:\s+(.+))?$/i;
        const match = text.trim().match(regex);
        
        if (!match) {
            return { 
                valid: false, 
                error: 'Invalid format. Use: /tip @username amount TOKEN [message]' 
            };
        }
        
        const [, username, amount, token, message] = match;
        
        const usernameValidation = this.validateTelegramUsername(username);
        if (!usernameValidation.valid) return usernameValidation;
        
        const amountValidation = this.validateAmount(amount);
        if (!amountValidation.valid) return amountValidation;
        
        const tokenValidation = this.validateTokenSymbol(token);
        if (!tokenValidation.valid) return tokenValidation;
        
        const messageValidation = this.validateMessage(message || '');
        if (!messageValidation.valid) return messageValidation;
        
        return {
            valid: true,
            data: {
                username: usernameValidation.username,
                amount: amountValidation.amount,
                tokenSymbol: tokenValidation.symbol,
                tokenAddress: tokenValidation.address,
                message: messageValidation.message
            }
        };
    }

    static parseWithdrawCommand(text) {
        const regex = /^\/withdraw\s+(\w+)\s+(\d+(?:\.\d+)?)\s+(0x[a-fA-F0-9]{40})$/i;
        const match = text.trim().match(regex);
        
        if (!match) {
            return { 
                valid: false, 
                error: 'Invalid format. Use: /withdraw TOKEN amount 0x...' 
            };
        }
        
        const [, token, amount, address] = match;
        
        const tokenValidation = this.validateTokenSymbol(token);
        if (!tokenValidation.valid) return tokenValidation;
        
        const amountValidation = this.validateAmount(amount);
        if (!amountValidation.valid) return amountValidation;
        
        const addressValidation = this.validateEthereumAddress(address);
        if (!addressValidation.valid) return addressValidation;
        
        return {
            valid: true,
            data: {
                tokenSymbol: tokenValidation.symbol,
                tokenAddress: tokenValidation.address,
                amount: amountValidation.amount,
                address: addressValidation.address
            }
        };
    }
}

module.exports = Validation;