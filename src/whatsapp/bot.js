const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const WhatsAppQRServer = require('./qr-web');
const User = require('../database/models/User');
const Transaction = require('../database/models/Transaction');
const WalletManager = require('../blockchain/wallet');
const TransactionManager = require('../blockchain/transactions');
const { NETWORKS, TOKENS, LIMITS, MESSAGES } = require('../utils/constants');
const { parseAmount } = require('../utils/validation');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "cryptotip-whatsapp"
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        
        this.walletManager = new WalletManager();
        this.transactionManager = new TransactionManager();
        this.qrServer = new WhatsAppQRServer(3002);
        
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('qr', (qr) => {
            console.log('🔗 WhatsApp QR Code Generated');
            qrcode.generate(qr, { small: true });
            console.log('📱 Scan the QR code above with your WhatsApp mobile app');
            console.log('🌐 Or visit: http://localhost:3002/whatsapp-qr for a larger view');
            
            // Update web QR server
            this.qrServer.updateQR(qr);
        });

        this.client.on('ready', () => {
            console.log('✅ WhatsApp bot is ready!');
            console.log('📱 Users can now message your WhatsApp number to use the bot');
            this.qrServer.clearQR();
        });

        this.client.on('authenticated', () => {
            console.log('🔐 WhatsApp bot authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
        });

        this.client.on('message', async (msg) => {
            await this.handleMessage(msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('🔌 WhatsApp bot disconnected:', reason);
        });
    }

    async start() {
        try {
            this.qrServer.start();
            await this.client.initialize();
        } catch (error) {
            console.error('Failed to start WhatsApp bot:', error);
        }
    }

    async stop() {
        this.qrServer.stop();
        await this.client.destroy();
    }

    async handleMessage(msg) {
        try {
            // Ignore status updates and messages from groups (for now)
            if (msg.from === 'status@broadcast' || msg.isGroupMsg) {
                return;
            }

            const userId = msg.from.replace('@c.us', ''); // WhatsApp ID format
            const text = msg.body.toLowerCase().trim();
            const args = text.split(' ');
            const command = args[0];

            console.log(`WhatsApp message from ${userId}: ${text}`);

            // Handle commands
            switch (command) {
                case '/start':
                case 'start':
                    await this.handleStart(msg, userId);
                    break;
                case '/help':
                case 'help':
                    await this.handleHelp(msg);
                    break;
                case '/balance':
                case 'balance':
                    await this.handleBalance(msg, userId, args);
                    break;
                case '/deposit':
                case 'deposit':
                    await this.handleDeposit(msg, userId);
                    break;
                case '/tip':
                case 'tip':
                    await this.handleTip(msg, userId, args);
                    break;
                case '/withdraw':
                case 'withdraw':
                    await this.handleWithdraw(msg, userId, args);
                    break;
                case '/network':
                case 'network':
                    await this.handleNetwork(msg, userId, args);
                    break;
                default:
                    // Check for natural language patterns
                    await this.handleNaturalLanguage(msg, userId, text);
                    break;
            }

        } catch (error) {
            console.error('WhatsApp message handling error:', error);
            await this.sendMessage(msg.from, '❌ An error occurred. Please try again.');
        }
    }

    async sendMessage(chatId, text) {
        try {
            await this.client.sendMessage(chatId, text);
        } catch (error) {
            console.error('Failed to send WhatsApp message:', error);
        }
    }

    async handleStart(msg, userId) {
        try {
            const existingUser = await User.findById(userId);
            
            if (existingUser) {
                await this.sendMessage(msg.from, 
                    `👋 Welcome back!\n\n` +
                    `Your wallet is already set up:\n` +
                    `Address: \`${existingUser.wallet_address}\`\n\n` +
                    `Type *help* for available commands.`
                );
                return;
            }

            // Create new wallet for user
            const wallet = this.walletManager.generateWallet();
            const encryptedPrivateKey = this.walletManager.encryptAndStoreWallet(
                wallet.privateKey, 
                process.env.PRIVATE_KEY_PASSWORD
            );

            await User.create(userId, null, wallet.address, encryptedPrivateKey);

            await this.sendMessage(msg.from, 
                `🎉 *Welcome to CryptoTip Bot!*\n\n` +
                `Your crypto wallet has been created:\n` +
                `Address: \`${wallet.address}\`\n\n` +
                `You can now:\n` +
                `• Send tips to friends\n` +
                `• Check your balance\n` +
                `• Get your deposit address\n\n` +
                `Type *help* for all commands.\n\n` +
                `🌐 *Supported Networks:* Base, Polygon, Arbitrum\n` +
                `💰 *Tokens:* USDC, USDT, ETH/MATIC`
            );

        } catch (error) {
            console.error('WhatsApp start command error:', error);
            await this.sendMessage(msg.from, '❌ Failed to create wallet. Please try again.');
        }
    }

    async handleHelp(msg) {
        const helpText = `💡 *CryptoTip Bot Commands:*\n\n` +
            `💰 *Wallet:*\n` +
            `• *deposit* - Get your wallet address\n` +
            `• *balance* - Check your balances\n` +
            `• *withdraw USDC 10 0x123...* - Send to external wallet\n` +
            `• *network* - Switch default network\n\n` +
            `🎁 *Tipping:* (reply to someone's message)\n` +
            `• *tip 5 USDC thanks!* - Send $5 USDC\n` +
            `• *send 0.001 ETH great post* - Send ETH\n\n` +
            `🌐 *Networks:* Base, Polygon, Arbitrum\n` +
            `*Tokens:* USDC, USDT, ETH/MATIC\n` +
            `Max tip: $${LIMITS.MAX_TIP_AMOUNT} | Daily limit: $${LIMITS.MAX_DAILY_AMOUNT}`;

        await this.sendMessage(msg.from, helpText);
    }

    async handleBalance(msg, userId, args) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return await this.sendMessage(msg.from, '❌ Please type *start* first to create your wallet.');
            }

            const network = args[1] ? args[1].toUpperCase() : (user.preferred_network || 'BASE');
            
            if (!NETWORKS[network]) {
                return await this.sendMessage(msg.from, 
                    `❌ Invalid network. Available: ${Object.keys(NETWORKS).join(', ')}`
                );
            }

            const tokens = TOKENS[network];
            const networkInfo = NETWORKS[network];
            
            let balanceText = `💰 *${networkInfo.NAME} Balances:*\n\n`;
            
            for (const [symbol, tokenInfo] of Object.entries(tokens)) {
                try {
                    const balance = await this.walletManager.getWalletBalance(
                        user.wallet_address,
                        tokenInfo.address === 'native' ? null : tokenInfo.address,
                        network,
                        tokenInfo.decimals
                    );
                    const balanceNum = parseFloat(balance);
                    balanceText += `${symbol}: ${balanceNum.toFixed(6)}\n`;
                } catch (error) {
                    balanceText += `${symbol}: 0.000000\n`;
                }
            }

            balanceText += `\nAddress: \`${user.wallet_address}\``;
            await this.sendMessage(msg.from, balanceText);

        } catch (error) {
            console.error('WhatsApp balance command error:', error);
            await this.sendMessage(msg.from, '❌ Failed to get balance. Please try again.');
        }
    }

    async handleDeposit(msg, userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return await this.sendMessage(msg.from, '❌ Please type *start* first to create your wallet.');
            }

            const network = user.preferred_network || 'BASE';
            const networkInfo = NETWORKS[network];
            
            await this.sendMessage(msg.from,
                `💳 *Deposit Address (${networkInfo.NAME}):*\n\n` +
                `\`${user.wallet_address}\`\n\n` +
                `⚠️ *Important:*\n` +
                `• Only send tokens on ${networkInfo.NAME} network\n` +
                `• Supported tokens: ${Object.keys(TOKENS[network]).join(', ')}\n` +
                `• Test with small amounts first\n\n` +
                `🔗 Explorer: ${networkInfo.EXPLORER}`
            );

        } catch (error) {
            console.error('WhatsApp deposit command error:', error);
            await this.sendMessage(msg.from, '❌ Failed to get deposit address. Please try again.');
        }
    }

    async handleTip(msg, userId, args) {
        try {
            // WhatsApp tipping requires replying to someone's message
            if (!msg.hasQuotedMsg) {
                return await this.sendMessage(msg.from, 
                    '❌ To tip someone, reply to their message with:\n*tip 5 USDC thanks!*'
                );
            }

            const quotedMsg = await msg.getQuotedMessage();
            const recipientId = quotedMsg.from.replace('@c.us', '');

            if (recipientId === userId) {
                return await this.sendMessage(msg.from, '❌ You cannot tip yourself!');
            }

            if (args.length < 3) {
                return await this.sendMessage(msg.from, 
                    '❌ Usage: *tip <amount> <token> [message]*\nExample: *tip 5 USDC thanks!*'
                );
            }

            const amount = args[1];
            const token = args[2].toUpperCase();
            const message = args.slice(3).join(' ');

            await this.processTip(msg, userId, recipientId, amount, token, message);

        } catch (error) {
            console.error('WhatsApp tip command error:', error);
            await this.sendMessage(msg.from, '❌ Tip failed. Please try again.');
        }
    }

    async processTip(msg, senderId, recipientId, amount, token, message) {
        const parsedAmount = parseAmount(amount);
        if (!parsedAmount) {
            return await this.sendMessage(msg.from, '❌ Invalid amount format');
        }

        // Get sender and recipient
        const sender = await User.findById(senderId);
        const recipient = await User.findById(recipientId);

        if (!sender) {
            return await this.sendMessage(msg.from, '❌ Please type *start* first to create your wallet.');
        }

        if (!recipient) {
            return await this.sendMessage(msg.from, '❌ Recipient needs to start the bot first.');
        }

        const network = sender.preferred_network || 'BASE';
        const tokenInfo = TOKENS[network][token];
        
        if (!tokenInfo) {
            return await this.sendMessage(msg.from, `❌ Token ${token} not supported on ${network}`);
        }

        // Check limits
        if (parsedAmount > LIMITS.MAX_TIP_AMOUNT) {
            return await this.sendMessage(msg.from, `❌ Maximum tip amount is $${LIMITS.MAX_TIP_AMOUNT}`);
        }

        // Process the transaction
        try {
            const senderWallet = this.walletManager.decryptWallet(
                sender.encrypted_private_key, 
                process.env.PRIVATE_KEY_PASSWORD, 
                network
            );
            
            const recipientWallet = this.walletManager.decryptWallet(
                recipient.encrypted_private_key, 
                process.env.PRIVATE_KEY_PASSWORD, 
                network
            );

            // Check balance
            const balance = await this.walletManager.getWalletBalance(
                senderWallet.address,
                tokenInfo.address === 'native' ? null : tokenInfo.address,
                network,
                tokenInfo.decimals
            );

            if (parseFloat(balance) < parsedAmount) {
                return await this.sendMessage(msg.from, 
                    `❌ Insufficient balance. You have ${balance} ${token}, need ${parsedAmount} ${token}.`
                );
            }

            // Send transaction
            await this.sendMessage(msg.from, '🔄 Processing tip...');

            const txHash = await this.transactionManager.sendTransaction(
                senderWallet,
                recipientWallet.address,
                parsedAmount.toString(),
                tokenInfo.address === 'native' ? null : tokenInfo.address,
                tokenInfo.decimals,
                network
            );

            // Record transaction
            await Transaction.create({
                sender_id: senderId,
                recipient_id: recipientId,
                amount: parsedAmount,
                token: token,
                network: network,
                tx_hash: txHash,
                message: message,
                status: 'completed'
            });

            // Send confirmations
            const networkInfo = NETWORKS[network];
            await this.sendMessage(msg.from, 
                `✅ *Tip Sent!*\n\n` +
                `Amount: ${parsedAmount} ${token}\n` +
                `Network: ${networkInfo.NAME}\n` +
                `Transaction: ${networkInfo.EXPLORER}/tx/${txHash}`
            );

            // Notify recipient
            await this.sendMessage(recipientId + '@c.us', 
                `🎉 *You received a tip!*\n\n` +
                `Amount: ${parsedAmount} ${token}\n` +
                `${message ? `Message: "${message}"\n` : ''}` +
                `Network: ${networkInfo.NAME}\n` +
                `Transaction: ${networkInfo.EXPLORER}/tx/${txHash}`
            );

        } catch (error) {
            console.error('WhatsApp tip processing error:', error);
            await this.sendMessage(msg.from, '❌ Transaction failed. Please try again.');
        }
    }

    async handleNaturalLanguage(msg, userId, text) {
        // Check for natural language tip patterns
        const tipPatterns = [
            /send\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\w+)/i,
            /give\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\w+)/i,
            /tip\s+(\d+(?:\.\d+)?)\s+(\w+)/i
        ];

        for (const pattern of tipPatterns) {
            const match = text.match(pattern);
            if (match && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                const recipientId = quotedMsg.from.replace('@c.us', '');
                
                if (pattern.source.includes('tip\\s+')) {
                    // Pattern: "tip 5 USDC"
                    await this.processTip(msg, userId, recipientId, match[1], match[2], '');
                } else {
                    // Pattern: "send/give 5 USDC"
                    await this.processTip(msg, userId, recipientId, match[2], match[3], '');
                }
                return;
            }
        }

        // No matching command or pattern
        if (text.includes('tip') || text.includes('send') || text.includes('crypto')) {
            await this.sendMessage(msg.from, 
                '🤔 I didn\'t understand that command.\nType *help* for available commands.'
            );
        }
    }

    async handleNetwork(msg, userId, args) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return await this.sendMessage(msg.from, '❌ Please type *start* first to create your wallet.');
            }

            if (args.length === 1) {
                const currentNetwork = user.preferred_network || 'BASE';
                const networkInfo = NETWORKS[currentNetwork];
                
                let networkText = `🌐 *Current Network:* ${networkInfo.NAME}\n\n*Available Networks:*\n`;
                
                Object.entries(NETWORKS).forEach(([key, network]) => {
                    const current = key === currentNetwork ? '✅' : '⚪';
                    networkText += `${current} ${network.NAME} (${key})\n`;
                });
                
                networkText += '\nUse *network <name>* to switch\nExample: *network POLYGON*';
                
                await this.sendMessage(msg.from, networkText);
                return;
            }

            const networkName = args[1].toUpperCase();
            if (!NETWORKS[networkName]) {
                return await this.sendMessage(msg.from, 
                    `❌ Invalid network. Available: ${Object.keys(NETWORKS).join(', ')}`
                );
            }

            await User.updatePreferredNetwork(userId, networkName);
            const networkInfo = NETWORKS[networkName];
            
            await this.sendMessage(msg.from,
                `✅ *Switched to ${networkInfo.NAME}*\n\n` +
                `Chain ID: ${networkInfo.CHAIN_ID}\n` +
                `Explorer: ${networkInfo.EXPLORER}`
            );

        } catch (error) {
            console.error('WhatsApp network command error:', error);
            await this.sendMessage(msg.from, '❌ Failed to switch network. Please try again.');
        }
    }

    async handleWithdraw(msg, userId, args) {
        if (args.length < 4) {
            return await this.sendMessage(msg.from, 
                '❌ Usage: *withdraw <token> <amount> <address>*\n' +
                'Example: *withdraw USDC 10 0x742d35Cc6634C0532925a3b8D9C05f814c30e4c7*'
            );
        }

        // Implementation similar to Telegram bot withdraw command
        await this.sendMessage(msg.from, 
            '🚧 Withdrawal feature coming soon!\nFor now, you can use external wallets to manage your funds.'
        );
    }
}

module.exports = WhatsAppBot;