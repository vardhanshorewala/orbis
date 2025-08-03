import { Address } from '@ton/core';

// Order phases from the flow diagram
export enum OrderPhase {
    ANNOUNCEMENT = 'announcement',
    DEPOSITING = 'depositing', 
    WITHDRAWAL = 'withdrawal',
    RECOVERY = 'recovery'
}

// Order status tracking
export enum OrderStatus {
    CREATED = 'created',
    MAKER_SIGNED = 'maker_signed',
    TAKER_SIGNED = 'taker_signed',
    DEPOSITED_SOURCE = 'deposited_source',
    DEPOSITED_DESTINATION = 'deposited_destination',
    SECRETS_SHARED = 'secrets_shared',
    WITHDRAWN_MAKER = 'withdrawn_maker',
    WITHDRAWN_TAKER = 'withdrawn_taker',
    CANCELLED_MAKER = 'cancelled_maker',
    CANCELLED_TAKER = 'cancelled_taker',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

// Asset types supported
export enum AssetType {
    NATIVE_TON = 0,
    JETTON = 1,
    NATIVE_ETH = 2,
    ERC20 = 3
}

// Network identifiers
export enum Network {
    TON_MAINNET = 'ton-mainnet',
    TON_TESTNET = 'ton-testnet',
    ETHEREUM_MAINNET = 'ethereum-mainnet',
    ETHEREUM_SEPOLIA = 'ethereum-sepolia'
}

// 1inch Fusion order structure adapted for cross-chain
export interface FusionOrder {
    // Order identification
    orderId: string;
    nonce: bigint;
    
    // Participants
    maker: string; // Address on source chain
    taker?: string; // Address on destination chain
    resolver: string; // Relayer address
    
    // Asset details
    makerAsset: {
        type: AssetType;
        address: string; // Token contract address or native asset identifier
        amount: bigint;
        network: Network;
    };
    
    takerAsset: {
        type: AssetType;
        address: string;
        amount: bigint;
        network: Network;
    };
    
    // Cross-chain specific
    sourceChain: Network;
    destinationChain: Network;
    
    // Addresses for refunds/targets
    refundAddress: string; // Where to refund maker on source chain
    targetAddress: string; // Where to send taker assets on destination chain
    
    // Security and timing
    secretHash: string; // 32-bit hash for atomic swaps
    timelockDuration: number; // Seconds
    finalityTimelock: number; // Additional finality buffer
    exclusivePeriod?: number; // Exclusive period for destination escrow
    
    // Safety deposits
    makerSafetyDeposit: bigint;
    takerSafetyDeposit?: bigint;
    
    // Status tracking
    status: OrderStatus;
    phase: OrderPhase;
    createdAt: number;
    updatedAt: number;
    
    // Signatures
    makerSignature?: string;
    takerSignature?: string;
}

// Escrow contract details
export interface EscrowDetails {
    status: number;
    makerAddress: Address;
    resolverAddress: Address;
    targetAddress: Address;
    refundAddress: Address;
    assetType: number;
    jettonMaster: Address;
    amount: bigint;
    safetyDeposit: bigint;
    timelockDuration: number;
    createdAt: number;
    exclusivePeriod?: number; // Only for destination escrow
}

// Secret management
export interface SecretData {
    secret: string; // 32-bit hex string
    hash: string; // Hash of the secret
    revealed: boolean;
    revealedAt?: number;
}

// Relayer configuration
export interface RelayerConfig {
    // Network configurations
    tonNetwork: Network;
    evmNetwork: Network;
    
    // TON configuration
    tonEndpoint: string;
    tonApiKey?: string;
    tonMnemonic: string;
    
    // Contract addresses
    tonSourceEscrowCode: string; // Base64 encoded code
    tonDestinationEscrowCode: string;
    
    // Operational settings
    gasLimits: {
        tonDeploy: bigint;
        tonLock: bigint;
        tonWithdraw: bigint;
        tonRefund: bigint;
    };
    
    // Timing configurations
    defaultTimelockDuration: number;
    defaultFinalityTimelock: number;
    defaultExclusivePeriod: number;
    
    // Safety settings
    minSafetyDeposit: bigint;
    maxOrderAmount: bigint;
}

// Events emitted by the relayer
export interface RelayerEvent {
    type: 'order_created' | 'order_signed' | 'deposit_detected' | 'secret_shared' | 'withdrawal_completed' | 'order_cancelled' | 'error';
    orderId: string;
    timestamp: number;
    data: any;
}

// Error types
export class RelayerError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly orderId?: string
    ) {
        super(message);
        this.name = 'RelayerError';
    }
}

export class ContractError extends RelayerError {
    constructor(message: string, orderId?: string) {
        super(message, 'CONTRACT_ERROR', orderId);
    }
}

export class NetworkError extends RelayerError {
    constructor(message: string, orderId?: string) {
        super(message, 'NETWORK_ERROR', orderId);
    }
}

export class ValidationError extends RelayerError {
    constructor(message: string, orderId?: string) {
        super(message, 'VALIDATION_ERROR', orderId);
    }
} 