import {
    JsonRpcProvider,
    Wallet,
    Contract,
    parseEther,
    formatEther,
    keccak256,
    toUtf8Bytes,
    getAddress
} from 'ethers';
import {
    CrossChainSwapOrder,
    EscrowDeployment,
    EscrowStatus,
    ResolverError
} from '../types';
import { Logger } from '../utils';

// ABI snippets for escrow contracts
const ESCROW_FACTORY_ABI = [
    'function createSrcEscrow(bytes32 secretHash, uint256 timelock, address token, uint256 amount, address maker, address resolver, uint256 safetyDeposit) returns (address)',
    'function createDstEscrow(bytes32 secretHash, uint256 timelock, address token, uint256 amount, address maker, address resolver, uint256 safetyDeposit) returns (address)',
    'function srcEscrowImplementation() view returns (address)',
    'function dstEscrowImplementation() view returns (address)'
];

const ESCROW_ABI = [
    'function initialize(bytes32 secretHash, uint256 timelock, address token, uint256 amount, address maker, address resolver, uint256 safetyDeposit)',
    'function lockFunds() payable',
    'function lockTokens(uint256 amount)',
    'function revealSecret(bytes32 secret, address recipient)',
    'function cancel()',
    'function getStatus() view returns (bool isLocked, bool isExecuted, bool canRefund, uint256 balance)',
    'function secretHash() view returns (bytes32)',
    'function timelock() view returns (uint256)',
    'function maker() view returns (address)',
    'function resolver() view returns (address)',
    'function token() view returns (address)',
    'function amount() view returns (uint256)'
];

/**
 * EVM Blockchain Adapter for Resolver
 * Handles all EVM-specific operations including escrow deployment and management
 */
export class EvmAdapter {
    private provider!: JsonRpcProvider;
    private wallet!: Wallet;
    private escrowFactory?: Contract;

    constructor(
        private config: {
            rpcUrl: string;
            privateKey: string;
            chainId: number;
            escrowFactoryAddress?: string;
        }
    ) { }

    async initialize(): Promise<void> {
        try {
            // Initialize provider and wallet
            this.provider = new JsonRpcProvider(this.config.rpcUrl);
            this.wallet = new Wallet(this.config.privateKey, this.provider);

            // Verify chain ID
            const network = await this.provider.getNetwork();
            if (Number(network.chainId) !== this.config.chainId) {
                throw new Error(`Chain ID mismatch: expected ${this.config.chainId}, got ${network.chainId}`);
            }

            // Initialize escrow factory contract if address provided
            if (this.config.escrowFactoryAddress) {
                this.escrowFactory = new Contract(
                    this.config.escrowFactoryAddress,
                    ESCROW_FACTORY_ABI,
                    this.wallet
                );
            }

            Logger.info('✅ EVM adapter initialized', {
                address: this.wallet.address,
                chainId: this.config.chainId,
                factory: this.config.escrowFactoryAddress
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to initialize EVM adapter: ${errorMessage}`, {
                code: 'EVM_INIT_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Deploy escrow contract on EVM
     */
    async deployEscrow(
        order: CrossChainSwapOrder,
        secretHash: string,
        type: 'source' | 'destination'
    ): Promise<EscrowDeployment> {
        try {
            if (!this.escrowFactory) {
                throw new Error('Escrow factory not configured');
            }

            Logger.info('🚀 Deploying EVM escrow', { type, orderId: order.orderId });

            // Convert secret hash to bytes32
            const secretHashBytes32 = '0x' + secretHash;

            // Safety deposit as per whitepaper (0.1 ETH equivalent)
            const safetyDeposit = parseEther('0.01');

            // Determine token address (0x0 for native ETH)
            const tokenAddress = order.fromToken === 'ETH' || order.toToken === 'ETH'
                ? '0x0000000000000000000000000000000000000000'
                : order.fromToken; // Assuming token addresses are provided

            // Deploy appropriate escrow type
            const tx = type === 'source'
                ? await this.escrowFactory.createSrcEscrow(
                    secretHashBytes32,
                    order.timelock,
                    tokenAddress,
                    parseEther(order.amount),
                    getAddress(order.makerAddress),
                    this.wallet.address,
                    safetyDeposit,
                    { value: safetyDeposit }
                )
                : await this.escrowFactory.createDstEscrow(
                    secretHashBytes32,
                    order.timelock,
                    tokenAddress,
                    parseEther(order.amount),
                    getAddress(order.makerAddress),
                    this.wallet.address,
                    safetyDeposit,
                    { value: safetyDeposit }
                );

            const receipt = await tx.wait();

            // Extract escrow address from events
            // TODO: Parse actual event to get deployed address
            const escrowAddress = await this.getEscrowAddressFromReceipt(receipt);

            const deployment: EscrowDeployment = {
                chain: 'evm',
                contractAddress: escrowAddress,
                transactionHash: receipt.hash,
                secretHash,
                amount: order.amount,
                timelock: order.timelock,
                deployer: this.wallet.address,
                status: EscrowStatus.DEPLOYED
            };

            Logger.info('✅ EVM escrow deployed', {
                address: deployment.contractAddress,
                type,
                txHash: receipt.hash
            });

            return deployment;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to deploy EVM escrow: ${errorMessage}`, {
                code: 'EVM_DEPLOY_ERROR',
                orderId: order.orderId,
                chain: 'evm'
            });
        }
    }

    /**
     * Lock funds in escrow
     */
    async lockFunds(
        escrowAddress: string,
        amount: string,
        tokenAddress?: string
    ): Promise<string> {
        try {
            Logger.info('🔒 Locking funds in EVM escrow', {
                escrow: escrowAddress,
                amount,
                token: tokenAddress
            });

            const escrow = new Contract(escrowAddress, ESCROW_ABI, this.wallet);

            let tx;
            if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                // Lock native ETH
                tx = await escrow.lockFunds({
                    value: parseEther(amount)
                });
            } else {
                // Lock ERC20 tokens
                // First approve the escrow to spend tokens
                const tokenContract = new Contract(
                    tokenAddress,
                    ['function approve(address spender, uint256 amount) returns (bool)'],
                    this.wallet
                );

                const approveTx = await tokenContract.approve(
                    escrowAddress,
                    parseEther(amount)
                );
                await approveTx.wait();

                // Then lock the tokens
                tx = await escrow.lockTokens(parseEther(amount));
            }

            const receipt = await tx.wait();

            Logger.info('✅ Funds locked', {
                txHash: receipt.hash,
                escrow: escrowAddress
            });

            return receipt.hash;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to lock funds: ${errorMessage}`, {
                code: 'EVM_LOCK_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Reveal secret and claim funds
     */
    async revealSecret(
        escrowAddress: string,
        secret: string,
        recipientAddress: string
    ): Promise<string> {
        try {
            Logger.info('🔓 Revealing secret on EVM escrow', {
                escrow: escrowAddress
            });

            const escrow = new Contract(escrowAddress, ESCROW_ABI, this.wallet);

            // Convert secret to bytes32
            const secretBytes32 = '0x' + secret;

            const tx = await escrow.revealSecret(
                secretBytes32,
                getAddress(recipientAddress)
            );

            const receipt = await tx.wait();

            Logger.info('✅ Secret revealed and funds claimed', {
                txHash: receipt.hash,
                escrow: escrowAddress
            });

            return receipt.hash;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to reveal secret: ${errorMessage}`, {
                code: 'EVM_REVEAL_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Cancel escrow and refund
     */
    async cancelEscrow(escrowAddress: string): Promise<string> {
        try {
            Logger.info('🔄 Canceling EVM escrow', { escrow: escrowAddress });

            const escrow = new Contract(escrowAddress, ESCROW_ABI, this.wallet);

            const tx = await escrow.cancel();
            const receipt = await tx.wait();

            Logger.info('✅ Escrow canceled', {
                txHash: receipt.hash,
                escrow: escrowAddress
            });

            return receipt.hash;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to cancel escrow: ${errorMessage}`, {
                code: 'EVM_CANCEL_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Get escrow status
     */
    async getEscrowStatus(escrowAddress: string): Promise<{
        isLocked: boolean;
        isExecuted: boolean;
        canRefund: boolean;
        balance: string;
    }> {
        try {
            const escrow = new Contract(escrowAddress, ESCROW_ABI, this.provider);

            const [isLocked, isExecuted, canRefund, balance] = await escrow.getStatus();

            return {
                isLocked,
                isExecuted,
                canRefund,
                balance: formatEther(balance)
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to get escrow status: ${errorMessage}`, {
                code: 'EVM_STATUS_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(tokenAddress?: string): Promise<string> {
        try {
            if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                // Get ETH balance
                const balance = await this.provider.getBalance(this.wallet.address);
                return formatEther(balance);
            } else {
                // Get ERC20 balance
                const tokenContract = new Contract(
                    tokenAddress,
                    ['function balanceOf(address account) view returns (uint256)'],
                    this.provider
                );
                const balance = await tokenContract.balanceOf(this.wallet.address);
                return formatEther(balance);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to get balance: ${errorMessage}`, {
                code: 'EVM_BALANCE_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Estimate gas for a transaction
     */
    async estimateGas(
        to: string,
        data: string,
        value?: string
    ): Promise<{ gasLimit: bigint; gasPrice: bigint; totalCost: string }> {
        try {
            const tx = {
                to,
                data,
                value: value ? parseEther(value) : undefined
            };

            const gasLimit = await this.wallet.estimateGas(tx);
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice || BigInt(0);
            const totalCost = formatEther(gasLimit * gasPrice);

            return { gasLimit, gasPrice, totalCost };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new ResolverError(`Failed to estimate gas: ${errorMessage}`, {
                code: 'EVM_GAS_ERROR',
                chain: 'evm'
            });
        }
    }

    /**
     * Helper: Extract escrow address from deployment receipt
     */
    private async getEscrowAddressFromReceipt(receipt: any): Promise<string> {
        // TODO: Parse actual event logs to extract deployed escrow address
        // For now, return a placeholder
        if (receipt.logs && receipt.logs.length > 0) {
            // Typically the escrow address would be in the event logs
            // Look for EscrowCreated event or similar
            const deployedEvent = receipt.logs.find((log: any) =>
                log.topics[0] === keccak256(toUtf8Bytes('EscrowCreated(address,address,bytes32)'))
            );

            if (deployedEvent) {
                // Extract address from event data
                return '0x' + deployedEvent.topics[1].slice(26);
            }
        }

        throw new Error('Could not extract escrow address from receipt');
    }

    /**
     * Get chain name
     */
    getChainName(): string {
        switch (this.config.chainId) {
            case 1: return 'Ethereum';
            case 11155111: return 'Sepolia';
            case 137: return 'Polygon';
            case 56: return 'BSC';
            default: return `Chain ${this.config.chainId}`;
        }
    }
}