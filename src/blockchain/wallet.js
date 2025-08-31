const { ethers } = require('ethers');
const Encryption = require('../utils/encryption');
const { NETWORKS } = require('../utils/constants');

class WalletManager {
    constructor() {
        this.providers = {};
        this.initializeProviders();
    }

    initializeProviders() {
        this.providers.BASE = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || NETWORKS.BASE.RPC_URL);
        this.providers.POLYGON = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || NETWORKS.POLYGON.RPC_URL);
        this.providers.ARBITRUM = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL || NETWORKS.ARBITRUM.RPC_URL);
    }

    getProvider(network = 'BASE') {
        return this.providers[network.toUpperCase()] || this.providers.BASE;
    }

    generateWallet() {
        try {
            const wallet = ethers.Wallet.createRandom();
            return {
                address: wallet.address,
                privateKey: wallet.privateKey,
                mnemonic: wallet.mnemonic.phrase
            };
        } catch (error) {
            throw new Error('Failed to generate wallet: ' + error.message);
        }
    }

    encryptAndStoreWallet(privateKey, password) {
        try {
            return Encryption.encryptPrivateKey(privateKey, password);
        } catch (error) {
            throw new Error('Failed to encrypt wallet: ' + error.message);
        }
    }

    decryptWallet(encryptedPrivateKey, password, network = 'BASE') {
        try {
            const privateKey = Encryption.decryptPrivateKey(encryptedPrivateKey, password);
            return new ethers.Wallet(privateKey, this.getProvider(network));
        } catch (error) {
            throw new Error('Failed to decrypt wallet: ' + error.message);
        }
    }

    async getWalletBalance(address, tokenAddress = null, network = 'BASE', decimals = 18) {
        try {
            const provider = this.getProvider(network);
            if (!tokenAddress || tokenAddress === 'native') {
                const balance = await provider.getBalance(address);
                return ethers.formatEther(balance);
            } else {
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    ['function balanceOf(address) view returns (uint256)'],
                    provider
                );
                
                const balance = await tokenContract.balanceOf(address);
                return ethers.formatUnits(balance, decimals);
            }
        } catch (error) {
            throw new Error('Failed to get balance: ' + error.message);
        }
    }

    async estimateGasFee(to, value = 0, data = '0x') {
        try {
            const gasEstimate = await this.provider.estimateGas({
                to,
                value: ethers.parseEther(value.toString()),
                data
            });
            
            const feeData = await this.provider.getFeeData();
            const gasCost = gasEstimate * feeData.gasPrice;
            
            return {
                gasLimit: gasEstimate,
                gasPrice: feeData.gasPrice,
                gasCostWei: gasCost,
                gasCostEth: ethers.formatEther(gasCost)
            };
        } catch (error) {
            throw new Error('Failed to estimate gas: ' + error.message);
        }
    }

    async getTransactionReceipt(txHash) {
        try {
            return await this.provider.getTransactionReceipt(txHash);
        } catch (error) {
            throw new Error('Failed to get transaction receipt: ' + error.message);
        }
    }

    isValidPrivateKey(privateKey) {
        try {
            new ethers.Wallet(privateKey);
            return true;
        } catch {
            return false;
        }
    }

    async getNetworkInfo() {
        try {
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            
            return {
                chainId: network.chainId,
                name: network.name,
                blockNumber
            };
        } catch (error) {
            throw new Error('Failed to get network info: ' + error.message);
        }
    }
}

module.exports = WalletManager;