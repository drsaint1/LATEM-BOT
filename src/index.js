require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const database = require('./database/connection');
const { runMigrations } = require('./database/migrate');

const { handleStart } = require('./bot/commands/start');
const { handleBalance } = require('./bot/commands/balance');
const { handleTip } = require('./bot/commands/tip');
const { handleDeposit } = require('./bot/commands/deposit');
const { handleWithdraw } = require('./bot/commands/withdraw');
const { handleHistory } = require('./bot/commands/history');
const { handleStats } = require('./bot/commands/stats');
const { handleGroupStats, handleTippers, handleReceivers } = require('./bot/commands/groupstats');
const { handleHelp, handleSplit } = require('./bot/commands/help');
const handleNetworkCommand = require('./bot/commands/network');
const handleBatchTipCommand = require('./bot/commands/batchtip');
const handleSplitCommand = require('./bot/commands/split');
const WhatsAppBot = require('./whatsapp/bot');
const WebServer = require('./web/server');

const rateLimiter = require('./bot/middleware/rateLimiter');
const MessageFormatter = require('./bot/utils/messageFormatter');

class CryptoTipBot {
    constructor() {
        this.bot = null;
        this.whatsappBot = null;
        this.webServer = null;
        this.isShuttingDown = false;
    }

    async initialize() {
        try {
            if (!process.env.TELEGRAM_BOT_TOKEN) {
                throw new Error('TELEGRAM_BOT_TOKEN is required');
            }
            
            if (!process.env.PRIVATE_KEY_PASSWORD) {
                throw new Error('PRIVATE_KEY_PASSWORD is required');
            }

            await database.connect();

            await runMigrations(false);

            this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
                polling: {
                    interval: 300,
                    autoStart: false
                }
            });
            
            await this.bot.deleteWebHook({ drop_pending_updates: true });
            
            this.bot.startPolling();

            this.setupEventHandlers();
            this.setupCommandHandlers();
            
            // Start WhatsApp bot if enabled
            if (process.env.ENABLE_WHATSAPP === 'true') {
                try {
                    this.whatsappBot = new WhatsAppBot();
                    await this.whatsappBot.start();
                } catch (whatsappError) {
                    // WhatsApp bot failed to start, continue without it
                }
            }
            
            // Start web dashboard
            if (process.env.ENABLE_WEB === 'true' || !process.env.ENABLE_WEB) {
                try {
                    const PORT = process.env.WEB_PORT || 3000;
                    this.webServer = WebServer.listen(PORT).on('error', (webError) => {
                        // Web server error handling
                    });
                } catch (webError) {
                    // Web dashboard failed to start, continue without it
                }
            }
            
            
        } catch (error) {
            process.exit(1);
        }
    }

    setupEventHandlers() {
        this.bot.on('polling_error', (error) => {
            if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
                setTimeout(() => {
                    this.bot.stopPolling();
                    this.bot.startPolling({ restart: true });
                }, 5000);
            }
        });

        this.bot.on('error', (error) => {
            // Bot error handled silently
        });

        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
    }

    setupCommandHandlers() {
        this.bot.onText(/^\/start(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleStart);
        });

        this.bot.onText(/^\/help(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleHelp);
        });

        this.bot.onText(/^\/balance(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleBalance);
        });

        this.bot.onText(/^\/deposit(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleDeposit);
        });

        this.bot.onText(/^\/tip(@\w+)?\s+/, async (msg) => {
            await this.handleWithRateLimit(msg, handleTip);
        });

        this.bot.onText(/^\/withdraw(@\w+)?\s+/, async (msg) => {
            await this.handleWithRateLimit(msg, handleWithdraw);
        });

        this.bot.onText(/^\/history(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleHistory);
        });

        this.bot.onText(/^\/stats(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleStats);
        });

        this.bot.onText(/^\/groupstats(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleGroupStats);
        });

        this.bot.onText(/^\/tippers(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleTippers);
        });

        this.bot.onText(/^\/receivers(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleReceivers);
        });

        this.bot.onText(/^\/split(@\w+)?\s+/, async (msg) => {
            await this.handleWithRateLimit(msg, handleSplitCommand);
        });

        this.bot.onText(/^\/network(@\w+)?(\s|$)/, async (msg) => {
            await this.handleWithRateLimit(msg, handleNetworkCommand);
        });

        this.bot.onText(/^\/batchtip(@\w+)?\s+/, async (msg) => {
            await this.handleWithRateLimit(msg, handleBatchTipCommand);
        });

        this.bot.on('message', async (msg) => {
            if (!msg.text || msg.text.startsWith('/')) return;
            
            try {
                const naturalLanguageTip = this.parseNaturalLanguage(msg.text);
                if (naturalLanguageTip) {
                    msg.text = naturalLanguageTip;
                    await this.handleWithRateLimit(msg, handleTip);
                }
            } catch (error) {
                // Natural language parsing error handled silently
            }
        });
    }

    async handleWithRateLimit(msg, handler) {
        if (this.isShuttingDown) return;

        const telegramId = msg.from.id;
        
        try {
            const rateLimitResult = await rateLimiter.middleware(telegramId);
            
            if (!rateLimitResult.allowed) {
                return this.bot.sendMessage(
                    msg.chat.id, 
                    rateLimitResult.error,
                    { reply_to_message_id: msg.message_id }
                );
            }

            await handler(this.bot, msg);

        } catch (error) {
            
            try {
                await this.bot.sendMessage(
                    msg.chat.id,
                    MessageFormatter.formatError('Something went wrong. Please try again.'),
                    { reply_to_message_id: msg.message_id }
                );
            } catch (sendError) {
                // Error message send failed
            }
        }
    }

    parseNaturalLanguage(text) {
        const patterns = [
            /send\s+@?(\w+)\s+(\d+(?:\.\d+)?)\s*(usdc|usdt|eth|dollars?|bucks?)/i,
            /give\s+@?(\w+)\s+(\d+(?:\.\d+)?)\s*(usdc|usdt|eth|dollars?|bucks?)/i,
            /tip\s+@?(\w+)\s+(\d+(?:\.\d+)?)\s*(usdc|usdt|eth|dollars?|bucks?)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const [, username, amount, currency] = match;
                let token = currency.toUpperCase();
                
                if (['DOLLARS', 'DOLLAR', 'BUCKS', 'BUCK'].includes(token)) {
                    token = 'USDC';
                }
                
                return `/tip @${username} ${amount} ${token}`;
            }
        }

        return null;
    }

    async gracefulShutdown() {
        
        this.isShuttingDown = true;
        
        if (this.bot) {
            await this.bot.stopPolling();
        }

        if (this.whatsappBot) {
            await this.whatsappBot.stop();
        }

        if (this.webServer) {
            this.webServer.close();
        }

        if (database.db) {
            await database.close();
        }

        process.exit(0);
    }
}

const bot = new CryptoTipBot();
bot.initialize().catch(() => process.exit(1));