# CryptoTip Bot - Multi-Platform Cryptocurrency Tipping Bot

A powerful multi-platform bot that enables seamless cryptocurrency tipping across Telegram, WhatsApp, and the web using multiple blockchain networks (Base, Polygon, Arbitrum).

## 🚀 New Features for Aleph Hackathon

- 🌐 **Multi-Chain Support**: Base, Polygon, and Arbitrum networks
- 📱 **Cross-Platform**: Telegram, WhatsApp, and Web Dashboard
- 👥 **Batch Tipping**: Send to multiple users at once
- 🧾 **Bill Splitting**: Smart expense splitting with auto-payments  
- 📊 **Advanced Analytics**: Real-time portfolio tracking and insights
- 🔄 **Network Switching**: Choose your preferred blockchain
- 💡 **Smart Commands**: Enhanced natural language processing

## Core Features

- 💰 **Instant Tipping**: Send USDC, USDT, ETH, or MATIC to any user
- 🔐 **Secure Wallets**: Auto-generated encrypted wallets for each user  
- 📊 **Group Analytics**: Leaderboards and tipping statistics
- 💸 **Low Fees**: Multi-chain support for minimal transaction costs
- 🌐 **Natural Language**: Understands casual commands like "send alice 5 bucks"

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd aleph
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
   PRIVATE_KEY_PASSWORD=your_secure_password
   BASE_RPC_URL=https://mainnet.base.org
   ```

3. **Initialize Database**
   ```bash
   npm run migrate
   ```

4. **Start Bot**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Bot Commands

### Essential Commands
- `/start` - Create your crypto wallet
- `/help` - Show all commands with examples  
- `/balance [network]` - Check your token balances
- `/deposit [network]` - Get your wallet address for funding
- `/tip @username amount token [message]` - Send crypto tip
- `/withdraw token amount address [network]` - Send to external wallet
- `/history` - Recent transaction history
- `/network [network]` - Switch or view current network

### Advanced Commands
- `/batchtip @user1 @user2 amount token [message]` - Send to multiple users
- `/split total @user1 @user2 [token] [description]` - Split bills with auto-payment
- `/split calc total people` - Calculate split amounts only

### Group Commands  
- `/groupstats` - Group tipping statistics
- `/tippers` - Top tippers leaderboard
- `/receivers` - Top receivers leaderboard

### Examples
```
/tip @alice 5 USDC thanks for lunch!
/batchtip @alice @bob @charlie 10 USDC team lunch
/split 60 @alice @bob USDC dinner
/network POLYGON
/balance ARBITRUM
```

## Natural Language Support

The bot understands casual commands:
- "send alice 5 bucks" → `/tip @alice 5 USDC`
- "give bob $10 for pizza" → `/tip @bob 10 USDC for pizza`

## Security Features

- 🔐 AES-256 encrypted private keys
- ⚡ Rate limiting (10 tips/hour, 3/minute)  
- 💰 Amount limits ($100/tip, $500/day)
- 🛡️ Input validation and sanitization
- 🚫 Anti-spam protection

## Supported Networks & Tokens

### Base Network
| Token | Contract Address | 
|-------|------------------|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDT | `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2` |
| ETH | Native token |

### Polygon Network  
| Token | Contract Address |
|-------|------------------|
| USDC | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| USDT | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| MATIC | Native token |

### Arbitrum Network
| Token | Contract Address |
|-------|------------------|
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| USDT | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |  
| ETH | Native token |

## Architecture

```
src/
├── index.js              # Main bot entry point
├── bot/
│   ├── commands/         # Command handlers (/tip, /balance, etc)
│   ├── middleware/       # Rate limiting, validation
│   └── utils/            # Message formatting utilities
├── blockchain/
│   ├── wallet.js         # Wallet creation/management
│   └── transactions.js   # Blockchain interactions
├── database/
│   ├── models/           # User, Transaction, Balance models  
│   └── migrations/       # Database schema
└── utils/
    ├── encryption.js     # Private key encryption
    ├── validation.js     # Input validation
    └── constants.js      # Configuration constants
```

## Database Schema

- **users**: Telegram users and their encrypted wallets
- **transactions**: All tip transactions with status tracking  
- **balances**: Cached token balances with timestamps

## Deployment

### Railway/Render Deployment

1. Connect your GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on git push

### Manual Server Deployment

```bash
# Install dependencies
npm install --production

# Set up process manager
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name cryptotip-bot

# Setup auto-restart
pm2 startup
pm2 save
```

## Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN=        # From BotFather
PRIVATE_KEY_PASSWORD=      # Secure password for encryption

# Network RPC URLs (Optional)
BASE_RPC_URL=             # Base network RPC (default: https://mainnet.base.org)
POLYGON_RPC_URL=          # Polygon RPC (default: https://polygon-rpc.com)
ARBITRUM_RPC_URL=         # Arbitrum RPC (default: https://arb1.arbitrum.io/rpc)

# Platform Controls
ENABLE_WHATSAPP=          # Enable WhatsApp bot (default: false)
ENABLE_WEB=               # Enable web dashboard (default: true)
WEB_PORT=                 # Web dashboard port (default: 3000)

# Optional
DATABASE_URL=             # SQLite file path (default: ./database.sqlite)
RATE_LIMIT_WINDOW=        # Rate limit window in ms (default: 3600000)  
RATE_LIMIT_MAX=           # Max tips per window (default: 10)
MAX_TIP_AMOUNT=           # Max USD per tip (default: 100)
MAX_DAILY_AMOUNT=         # Max USD per day (default: 500)
MAX_GAS_SUBSIDY=          # Max gas subsidy in USD (default: 1)
```

## Platform Support

### 📱 Telegram Bot
The main bot interface with full feature support.

### 📞 WhatsApp Bot  
Cross-platform tipping via WhatsApp with reply-to-tip functionality.

### 🌐 Web Dashboard
Real-time analytics dashboard with:
- Portfolio tracking across all networks
- Transaction history and insights  
- Network statistics and leaderboards
- User search and management

## Development

```bash
# Install dependencies
npm install

# Run migrations
npm run migrate  

# Start Telegram bot only (default)
npm run dev

# Start with WhatsApp integration
npm run whatsapp

# Start web dashboard only
npm run web

# Start all platforms
npm run all
```

## Running Different Configurations

```bash
# Telegram only
npm start

# Telegram + WhatsApp  
ENABLE_WHATSAPP=true npm start

# Telegram + Web Dashboard
ENABLE_WEB=true npm start

# All platforms
ENABLE_WHATSAPP=true ENABLE_WEB=true npm start
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit: `git commit -m "Add feature"`
5. Push: `git push origin feature-name`
6. Submit pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Security Notice

- Never share your `.env` file or private keys
- Only send supported tokens on Base network
- Test with small amounts first
- Report security issues privately

## Support

- 📖 Documentation: [GitHub Wiki](../../wiki)
- 🐛 Bug Reports: [Issues](../../issues)  
- 💬 Community: [Telegram Group](https://t.me/cryptotipbot)

---

Built for the Aleph Hackathon 2025 🚀

## 🏆 Hackathon Achievements

This project demonstrates:

**Technicality** 🔧
- Multi-chain blockchain integration (Base, Polygon, Arbitrum)  
- Advanced wallet management with encrypted key storage
- Real-time transaction processing and monitoring
- Cross-platform API development

**Originality** 🎨  
- First multi-platform crypto tipping bot supporting WhatsApp
- Innovative bill splitting with automatic payments
- Smart batch tipping functionality
- Natural language processing for commands

**UI/UX/DX** 💻
- Intuitive web dashboard with real-time analytics
- Seamless cross-platform experience  
- Developer-friendly API and documentation
- Mobile-optimized interfaces

**Practicality** ⚡
- Real-world bill splitting for restaurants/groups
- Cross-platform money transfers
- Multi-chain portfolio management  
- Production-ready security features

**Presentation** 📢
- Comprehensive documentation and setup guides
- Live demo with working bot deployment
- Open-source codebase with clear architecture
- Multi-platform testing capabilities

## 🌟 Try It Now

1. **Telegram**: Search for @YourBotName
2. **Web Dashboard**: Visit [your-deployment-url.com](http://localhost:3000)  
3. **WhatsApp**: Scan QR code when running with WhatsApp enabled

---

**Multi-chain • Multi-platform • Multi-features**