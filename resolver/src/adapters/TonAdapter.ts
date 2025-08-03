import { 
    Address, 
    Cell, 
    internal, 
    toNano,
    fromNano,
    beginCell,
    Contract,
    ContractProvider,
    Sender,
    SendMode,
    contractAddress
} from '@ton/core';
import { createHash } from 'crypto';
import { TonClient, WalletContractV3R2, WalletContractV4 } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { 
    FusionOrder, 
    AssetType, 
    Network, 
    EscrowDetails, 
    SecretData,
    ContractError,
    NetworkError,
    ValidationError
} from '../typeston';

// Local interface definitions based on the wrapper contracts
export interface TonSourceEscrowConfig {
    makerAddress: Address;
    resolverAddress: Address;
    targetAddress: Address;
    refundAddress: Address;
    assetType: number;
    jettonMaster: Address;
    amount: bigint;
    safetyDeposit: bigint;
    secretHash: string;
    timelockDuration: number;
    finalityTimelock: number;
}

export interface TonDestinationEscrowConfig {
    resolverAddress: Address;
    makerAddress: Address;
    refundAddress: Address;
    assetType: number;
    jettonMaster: Address;
    amount: bigint;
    safetyDeposit: bigint;
    secretHash: string;
    timelockDuration: number;
    finalityTimelock: number;
    exclusivePeriod: number;
}

// Opcodes from the wrapper contracts
const Opcodes = {
    CREATE_ESCROW: 0x1,
    WITHDRAW: 0x2,
    REFUND: 0x3,
    LOCK_ESCROW: 0x5,
};

export interface TonAdapterConfig {
    network: Network;
    endpoint: string;
    apiKey?: string;
    mnemonic: string;
    sourceEscrowCode: Cell;
    destinationEscrowCode: Cell;
    walletVersion?: 'v3r2' | 'v4' | 'v5r1'; // Support different wallet versions
}

export class TonAdapter {
    private client: TonClient;
    private wallet?: WalletContractV3R2 | WalletContractV4;
    private keyPair?: any;
    private sourceEscrowCode: Cell;
    private destinationEscrowCode: Cell;

    constructor(private config: TonAdapterConfig) {
        this.client = new TonClient({
            endpoint: config.endpoint,
            apiKey: config.apiKey
        });
        this.sourceEscrowCode = config.sourceEscrowCode;
        this.destinationEscrowCode = config.destinationEscrowCode;
    }

    async initialize(): Promise<void> {
        try {
            // Initialize wallet from mnemonic
            this.keyPair = await mnemonicToWalletKey(this.config.mnemonic.split(' '));
            
            // Create wallet based on version
            const walletVersion = this.config.walletVersion || 'v3r2';
            
            switch (walletVersion) {
                case 'v3r2':
                    this.wallet = WalletContractV3R2.create({ 
                        workchain: 0, 
                        publicKey: this.keyPair.publicKey 
                    });
                    console.log('Using WalletContractV3R2');
                    break;
                case 'v4':
                    this.wallet = WalletContractV4.create({ 
                        workchain: 0, 
                        publicKey: this.keyPair.publicKey 
                    });
                    console.log('Using WalletContractV4');
                    break;
                
                default:
                    throw new Error(`Unsupported wallet version: ${walletVersion}`);
            }
            
            console.log(`TON Adapter initialized for ${this.config.network}`);
            console.log(`Wallet address: ${this.wallet.address.toString()}`);
            
            // Check wallet balance
            const balance = await this.getBalance();
            console.log(`Wallet balance: ${fromNano(balance)} TON`);
            
        } catch (error) {
            throw new NetworkError(`Failed to initialize TON adapter: ${error}`);
        }
    }

    async getBalance(): Promise<bigint> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        const state = await this.client.getContractState(this.wallet.address);
        return state.balance;
    }

    getWalletAddress(): string {
        if (!this.wallet) throw new Error('Wallet not initialized');
        return this.wallet.address.toString();
    }

    // === ESCROW CONTRACT HELPERS ===

    private createSourceEscrowConfigCell(config: TonSourceEscrowConfig): Cell {
        // Create reference cell for additional data
        const refCell = beginCell()
            .storeAddress(config.targetAddress)
            .storeAddress(config.refundAddress)
            .storeAddress(config.jettonMaster)
            .storeUint(parseInt(config.secretHash.replace('0x', ''), 16), 32)
            .storeUint(config.timelockDuration, 32)
            .storeUint(config.finalityTimelock, 32)
            .endCell();

        // Main cell with essential data
        return beginCell()
            .storeAddress(config.makerAddress)
            .storeAddress(config.resolverAddress)
            .storeUint(config.assetType, 8)
            .storeCoins(config.amount)
            .storeCoins(config.safetyDeposit)
            .storeRef(refCell)
            .endCell();
    }

    private createDestinationEscrowConfigCell(config: TonDestinationEscrowConfig): Cell {
        // Parse secret hash properly
        const secretHashHex = config.secretHash.replace('0x', '');
        const secretHashInt = parseInt(secretHashHex, 16);
        console.log(`🔐 Secret hash processing: "${config.secretHash}" -> "${secretHashHex}" -> ${secretHashInt}`);
        
        // Create reference cell for additional data
        const refCell = beginCell()
            .storeAddress(config.refundAddress)
            .storeAddress(config.jettonMaster)
            .storeUint(secretHashInt, 32)
            .storeUint(config.timelockDuration, 32)
            .storeUint(config.finalityTimelock, 32)
            .storeUint(config.exclusivePeriod, 32)
            .endCell();

        console.log('📦 Reference cell created with exclusivePeriod:', config.exclusivePeriod);

        // Main cell with essential data
        const mainCell = beginCell()
            .storeAddress(config.resolverAddress)
            .storeAddress(config.makerAddress)
            .storeUint(config.assetType, 8)
            .storeCoins(config.amount)
            .storeCoins(config.safetyDeposit)
            .storeRef(refCell)
            .endCell();

        console.log('📦 Main cell created with asset type:', config.assetType, 'amount:', config.amount.toString());
        return mainCell;
    }

    // === SOURCE ESCROW OPERATIONS ===

    async deploySourceEscrow(order: FusionOrder, secretHash: string): Promise<Address> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const config: TonSourceEscrowConfig = {
                makerAddress: Address.parse(order.maker),
                resolverAddress: this.wallet.address,
                targetAddress: Address.parse(order.targetAddress),
                refundAddress: Address.parse(order.refundAddress),
                assetType: order.makerAsset.type,
                jettonMaster: order.makerAsset.type === AssetType.JETTON 
                    ? Address.parse(order.makerAsset.address) 
                    : Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'), // Zero address
                amount: order.makerAsset.amount,
                safetyDeposit: order.makerSafetyDeposit,
                secretHash: secretHash,
                timelockDuration: order.timelockDuration,
                finalityTimelock: order.finalityTimelock
            };

            const data = this.createSourceEscrowConfigCell(config);
            const init = { code: this.sourceEscrowCode, data };
            const address = contractAddress(0, init);
            
            // Deploy the escrow contract
            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: address,
                    value: toNano('0.15'), // 0.05 + 0.01 + 0.05 + buffer
                    init,
                    body: beginCell().endCell() // Empty message for deployment
                })]
            });
            
            console.log(`Source escrow deployed at: ${address.toString()}`);
            return address;

        } catch (error) {
            throw new ContractError(`Failed to deploy source escrow: ${error}`, order.orderId);
        }
    }



    async lockSourceEscrow(escrowAddress: Address): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: escrowAddress,
                    value: toNano('0.05'),
                    body: beginCell()
                        .storeUint(Opcodes.LOCK_ESCROW, 32)
                        .storeUint(0, 64) // query_id
                        .endCell()
                })]
            });
            
            console.log(`Source escrow locked: ${escrowAddress.toString()}`);
        } catch (error) {
            throw new ContractError(`Failed to lock source escrow: ${error}`);
        }
    }

    async withdrawFromSourceEscrow(escrowAddress: Address, secret: string): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            // Create secret reference cell with 32-bit integer (like the wrapper does)
            const secretInt = parseInt(secret.replace('0x', ''), 16);
            const secretCell = beginCell()
                .storeUint(secretInt, 32)
                .endCell();

            console.log(`🔍 Debug: Sending withdrawal with opcode ${Opcodes.WITHDRAW} (0x${Opcodes.WITHDRAW.toString(16)})`);
            console.log(`🔍 Debug: Secret: 0x${secret}`);
            
            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: escrowAddress,
                    value: toNano('0.05'),
                    body: beginCell()
                        .storeUint(Opcodes.WITHDRAW, 32)
                        .storeUint(0, 64) // query_id
                        .storeRef(secretCell) // Store as reference, not inline
                        .endCell()
                })]
            });
            
            console.log(`Withdrew from source escrow: ${escrowAddress.toString()}`);
        } catch (error) {
            throw new ContractError(`Failed to withdraw from source escrow: ${error}`);
        }
    }

    async refundSourceEscrow(escrowAddress: Address): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: escrowAddress,
                    value: toNano('0.05'),
                    body: beginCell()
                        .storeUint(Opcodes.REFUND, 32)
                        .storeUint(0, 64) // query_id
                        .endCell()
                })]
            });
            
            console.log(`Refunded source escrow: ${escrowAddress.toString()}`);
        } catch (error) {
            throw new ContractError(`Failed to refund source escrow: ${error}`);
        }
    }

    // === DESTINATION ESCROW OPERATIONS ===

    async deployDestinationEscrow(order: FusionOrder, secretHash: string): Promise<Address> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            console.log('🔧 Creating destination escrow config...');
            const config: TonDestinationEscrowConfig = {
                resolverAddress: this.wallet.address,
                makerAddress: Address.parse(order.maker),
                refundAddress: Address.parse(order.refundAddress),
                assetType: order.takerAsset.type,
                jettonMaster: order.takerAsset.type === AssetType.JETTON 
                    ? Address.parse(order.takerAsset.address)
                    : Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'), // Zero address
                amount: order.takerAsset.amount,
                safetyDeposit: order.takerSafetyDeposit || BigInt(0),
                secretHash: secretHash,
                timelockDuration: order.timelockDuration,
                finalityTimelock: order.finalityTimelock,
                exclusivePeriod: order.exclusivePeriod || 3600 // Default 1 hour
            };

            console.log('📋 Destination escrow config:', {
                resolverAddress: config.resolverAddress.toString(),
                makerAddress: config.makerAddress.toString(),
                refundAddress: config.refundAddress.toString(),
                assetType: config.assetType,
                amount: config.amount.toString(),
                safetyDeposit: config.safetyDeposit.toString(),
                secretHash: config.secretHash,
                timelockDuration: config.timelockDuration,
                finalityTimelock: config.finalityTimelock,
                exclusivePeriod: config.exclusivePeriod
            });

            const data = this.createDestinationEscrowConfigCell(config);
            console.log('📦 Contract data cell created, size:', data.bits.length, 'bits');
            
            const init = { code: this.destinationEscrowCode, data };
            const address = contractAddress(0, init);
            console.log('📍 Computed contract address:', address.toString());
            
            // Deploy the escrow contract
            const walletContract = this.client.open(this.wallet);
            const seqno = await walletContract.getSeqno();
            console.log('🔢 Wallet seqno:', seqno);
            
            await walletContract.sendTransfer({
                seqno,
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: address,
                    value: toNano('0.25'), // Increased gas for deployment
                    init,
                    body: beginCell().endCell() // Empty message for deployment
                })]
            });
            
            console.log(`Destination escrow deployed at: ${address.toString()}`);
            return address;

        } catch (error) {
            console.error('❌ Deployment error details:', error);
            throw new ContractError(`Failed to deploy destination escrow: ${error}`, order.orderId);
        }
    }

    async lockDestinationEscrow(escrowAddress: Address): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: escrowAddress,
                    value: toNano('0.05'),
                    body: beginCell()
                        .storeUint(Opcodes.LOCK_ESCROW, 32)
                        .storeUint(0, 64) // query_id
                        .endCell()
                })]
            });
            
            console.log(`Destination escrow locked: ${escrowAddress.toString()}`);
        } catch (error) {
            throw new ContractError(`Failed to lock destination escrow: ${error}`);
        }
    }

    async withdrawFromDestinationEscrow(escrowAddress: Address, secret: string): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const secretInt = parseInt(secret.replace('0x', ''), 16);
            const secretCell = beginCell()
                .storeUint(secretInt, 32)
                .endCell();

            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: escrowAddress,
                    value: toNano('0.05'),
                    body: beginCell()
                        .storeUint(Opcodes.WITHDRAW, 32)
                        .storeUint(0, 64) // query_id
                        .storeRef(secretCell)
                        .endCell()
                })]
            });
            
            console.log(`Withdrew from destination escrow: ${escrowAddress.toString()}`);
        } catch (error) {
            throw new ContractError(`Failed to withdraw from destination escrow: ${error}`);
        }
    }

    async refundDestinationEscrow(escrowAddress: Address): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const walletContract = this.client.open(this.wallet);
            await walletContract.sendTransfer({
                seqno: await walletContract.getSeqno(),
                secretKey: this.keyPair.secretKey,
                sendMode: SendMode.PAY_GAS_SEPARATELY,
                messages: [internal({
                    to: escrowAddress,
                    value: toNano('0.05'),
                    body: beginCell()
                        .storeUint(Opcodes.REFUND, 32)
                        .storeUint(0, 64) // query_id
                        .endCell()
                })]
            });
            
            console.log(`Refunded destination escrow: ${escrowAddress.toString()}`);
        } catch (error) {
            throw new ContractError(`Failed to refund destination escrow: ${error}`);
        }
    }

    // === QUERY OPERATIONS ===
    // Note: Query operations would require the full contract wrappers
    // For now, we focus on the core deployment and transaction functionality

    // === UTILITY METHODS ===

    generateSecret(): SecretData {
        // Hardcode "test123" secret for debugging
        const testText = "test123";
        
        // Convert text to hex (first 4 bytes like the working script does)
        const secretBuffer = Buffer.from(testText);
        const secret = secretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
        
        // Create hash the same way the contract does: cell_hash() >> 224
        const secretCell = beginCell()
            .storeUint(parseInt(secret, 16), 32)
            .endCell();
        
        // Get cell hash and take first 32 bits (like contract does)
        const cellHashBuffer = secretCell.hash();
        const cellHashBigInt = BigInt('0x' + cellHashBuffer.toString('hex'));
        const hash32bit = Number(cellHashBigInt >> 224n); // Take first 32 bits
        const hash = hash32bit.toString(16).padStart(8, '0');
        
        console.log(`🔐 Secret generation (hardcoded "test123"):`);
        console.log(`   Text: "${testText}"`);
        console.log(`   Secret: 0x${secret}`);
        console.log(`   Cell hash: ${cellHashBuffer.toString('hex')}`);
        console.log(`   Hash (32-bit): 0x${hash}`);
        
        return {
            secret: secret,
            hash: hash,
            revealed: false
        };
    }

    validateOrder(order: FusionOrder): void {
        if (!order.orderId) {
            throw new ValidationError('Order ID is required');
        }
        
        if (!order.maker) {
            throw new ValidationError('Maker address is required');
        }
        
        if (!order.makerAsset.amount || order.makerAsset.amount <= 0) {
            throw new ValidationError('Maker asset amount must be positive');
        }
        
        if (!order.takerAsset.amount || order.takerAsset.amount <= 0) {
            throw new ValidationError('Taker asset amount must be positive');
        }
        
        if (order.timelockDuration < 3600) {
            throw new ValidationError('Timelock duration must be at least 1 hour');
        }
        
        // Validate addresses
        try {
            Address.parse(order.maker);
            Address.parse(order.refundAddress);
            Address.parse(order.targetAddress);
        } catch (error) {
            throw new ValidationError(`Invalid address format: ${error}`);
        }
    }

    formatAddress(address: string): string {
        try {
            return Address.parse(address).toString();
        } catch (error) {
            throw new ValidationError(`Invalid address format: ${address}`);
        }
    }

    async waitForTransaction(address: Address, timeout: number = 60000): Promise<void> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const state = await this.client.getContractState(address);
                if (state.lastTransaction) {
                    return;
                }
            } catch (error) {
                // Contract might not exist yet, continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new NetworkError(`Transaction timeout after ${timeout}ms`);
    }
} 