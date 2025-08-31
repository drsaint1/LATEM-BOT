const { ethers } = require('ethers');
const WalletManager = require('./wallet');
const { TOKENS, LIMITS } = require('../utils/constants');

class TransactionManager extends WalletManager {
    constructor() {
        super();
        this.ERC20_ABI = [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function balanceOf(address owner) view returns (uint256)',
            'function decimals() view returns (uint8)'
        ];
    }

    async sendEther(fromWallet, toAddress, amount) {
        try {
            const amountWei = ethers.parseEther(amount.toString());
            
            const tx = await fromWallet.sendTransaction({
                to: toAddress,
                value: amountWei
            });
            
            console.log(`ETH transfer initiated: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`ETH transfer confirmed in block ${receipt.blockNumber}`);
            
            return {
                success: true,
                txHash: tx.hash,
                receipt
            };
            
        } catch (error) {
            console.error('ETH transfer failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendERC20Token(fromWallet, toAddress, tokenAddress, amount) {
        try {
            const token = TOKENS[this.getTokenSymbolByAddress(tokenAddress)];
            const decimals = token ? token.decimals : 18;
            
            const contract = new ethers.Contract(tokenAddress, this.ERC20_ABI, fromWallet);
            
            const amountWei = ethers.parseUnits(amount.toString(), decimals);
            
            const tx = await contract.transfer(toAddress, amountWei);
            
            console.log(`Token transfer initiated: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`Token transfer confirmed in block ${receipt.blockNumber}`);
            
            return {
                success: true,
                txHash: tx.hash,
                receipt
            };
            
        } catch (error) {
            console.error('Token transfer failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async processTip(fromWallet, toAddress, amount, tokenSymbol) {
        try {
            let result;
            
            if (tokenSymbol === 'ETH') {
                result = await this.sendEther(fromWallet, toAddress, amount);
            } else {
                const tokenAddress = TOKENS[tokenSymbol].address;
                result = await this.sendERC20Token(fromWallet, toAddress, tokenAddress, amount);
            }
            
            return result;
            
        } catch (error) {
            console.error('Tip processing failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async checkSufficientBalance(walletAddress, amount, tokenSymbol) {
        try {
            let balance;
            
            if (tokenSymbol === 'ETH') {
                balance = await this.getWalletBalance(walletAddress, 'native');
            } else {
                const tokenAddress = TOKENS[tokenSymbol].address;
                balance = await this.getWalletBalance(walletAddress, tokenAddress);
            }
            
            const balanceNum = parseFloat(balance);
            const requiredAmount = parseFloat(amount);
            
            return {
                sufficient: balanceNum >= requiredAmount,
                currentBalance: balanceNum,
                required: requiredAmount
            };
            
        } catch (error) {
            console.error('Balance check failed:', error);
            return {
                sufficient: false,
                error: error.message
            };
        }
    }

    async estimateTransactionCost(fromAddress, toAddress, amount, tokenSymbol) {
        try {
            let gasEstimate;
            
            if (tokenSymbol === 'ETH') {
                gasEstimate = await this.estimateGasFee(
                    toAddress, 
                    amount
                );
            } else {
                const tokenAddress = TOKENS[tokenSymbol].address;
                const token = TOKENS[tokenSymbol];
                const amountWei = ethers.parseUnits(amount.toString(), token.decimals);
                
                const transferData = new ethers.Interface(this.ERC20_ABI)
                    .encodeFunctionData('transfer', [toAddress, amountWei]);
                
                gasEstimate = await this.estimateGasFee(
                    tokenAddress,
                    0,
                    transferData
                );
            }
            
            const gasCostUSD = parseFloat(gasEstimate.gasCostEth) * 2000;
            
            return {
                ...gasEstimate,
                gasCostUSD,
                canSubsidize: gasCostUSD <= LIMITS.MAX_GAS_SUBSIDY
            };
            
        } catch (error) {
            console.error('Gas estimation failed:', error);
            return {
                error: error.message
            };
        }
    }

    getTokenSymbolByAddress(address) {
        for (const [symbol, token] of Object.entries(TOKENS)) {
            if (token.address.toLowerCase() === address.toLowerCase()) {
                return symbol;
            }
        }
        return null;
    }

    async waitForConfirmation(txHash, confirmations = 1) {
        try {
            console.log(`Waiting for ${confirmations} confirmation(s) for tx: ${txHash}`);
            
            const receipt = await this.provider.waitForTransaction(txHash, confirmations);
            
            if (receipt.status === 1) {
                console.log(`Transaction confirmed: ${txHash}`);
                return { success: true, receipt };
            } else {
                console.error(`Transaction failed: ${txHash}`);
                return { success: false, error: 'Transaction failed' };
            }
            
        } catch (error) {
            console.error('Error waiting for confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    formatTransactionUrl(txHash) {
        return `https://sepolia.basescan.org/tx/${txHash}`;
    }
}

module.exports = TransactionManager;