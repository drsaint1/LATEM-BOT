const { NETWORKS } = require('../../utils/constants');
const User = require('../../database/models/User');

async function handleNetworkCommand(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    try {
        const user = await User.findById(userId);
        if (!user) {
            return bot.sendMessage(chatId, '❌ Please /start the bot first to create your wallet.');
        }

        if (args.length === 0) {
            const currentNetwork = user.preferred_network || 'BASE';
            const networkInfo = NETWORKS[currentNetwork];
            
            const networkList = Object.entries(NETWORKS)
                .map(([key, network]) => `${key === currentNetwork ? '✅' : '⚪'} ${network.NAME} (${key})`)
                .join('\n');

            return bot.sendMessage(chatId, 
                `🌐 **Current Network:** ${networkInfo.NAME}\n\n` +
                `**Available Networks:**\n${networkList}\n\n` +
                `Use /network <network> to switch\nExample: /network POLYGON`
            );
        }

        const networkName = args[0].toUpperCase();
        if (!NETWORKS[networkName]) {
            return bot.sendMessage(chatId, 
                `❌ Invalid network. Available: ${Object.keys(NETWORKS).join(', ')}`
            );
        }

        await User.updatePreferredNetwork(userId, networkName);
        const networkInfo = NETWORKS[networkName];
        
        bot.sendMessage(chatId, 
            `✅ Switched to **${networkInfo.NAME}**\n` +
            `Chain ID: ${networkInfo.CHAIN_ID}\n` +
            `Explorer: ${networkInfo.EXPLORER}`
        );

    } catch (error) {
        // Error occurred while processing network command
        bot.sendMessage(chatId, '❌ Failed to switch network. Please try again.');
    }
}

module.exports = handleNetworkCommand;