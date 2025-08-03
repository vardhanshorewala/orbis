// Types matching the relayer server interfaces

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

// Asset interface
export interface Asset {
    type: AssetType;
    address: string;
    amount: string; // String to handle large numbers from frontend
    network: Network;
}

// Request interface for creating orders
export interface CreateOrderRequest {
    maker: string;
    taker?: string;
    makerAsset: Asset;
    takerAsset: Asset;
    sourceChain: Network;
    destinationChain: Network;
    refundAddress: string;
    targetAddress: string;
    timelockDuration?: number;
    finalityTimelock?: number;
    exclusivePeriod?: number;
    makerSafetyDeposit?: string;
    takerSafetyDeposit?: string;
    secretHash?: string; // Add secret hash field for frontend-generated secrets
}

// Response from relayer when creating an order
export interface CreateOrderResponse {
    success: boolean;
    orderId: string;
    order: SerializedOrder;
    contracts: {
        sourceEscrow: string;
        destinationEscrow: string;
    };
    secret: {
        hash: string;
    };
    error?: string;
}

// Serialized order (with BigInt converted to string)
export interface SerializedOrder {
    orderId: string;
    nonce: string;
    maker: string;
    taker?: string;
    resolver: string;
    makerAsset: Asset;
    takerAsset: Asset;
    sourceChain: Network;
    destinationChain: Network;
    refundAddress: string;
    targetAddress: string;
    secretHash: string;
    timelockDuration: number;
    finalityTimelock: number;
    exclusivePeriod: number;
    makerSafetyDeposit: string;
    takerSafetyDeposit?: string;
    status: OrderStatus;
    phase: OrderPhase;
    createdAt: number;
    updatedAt: number;
}

// Secret data structure
export interface SecretData {
    secret: string;
    hash: string;
    generatedAt: number;
    revealedAt?: number;
}

// Swap configuration for UI
export interface SwapConfig {
    timelockDuration: number; // seconds
    finalityTimelock: number; // seconds
    exclusivePeriod: number; // seconds
    makerSafetyDeposit: string; // in smallest units
    showAdvanced: boolean;
}

export const DEFAULT_SWAP_CONFIG: SwapConfig = {
    timelockDuration: 3600, // 1 hour
    finalityTimelock: 2, // 11 seconds for testing (like end-to-end-ton.ts)
    exclusivePeriod: 3600, // 1 hour
    makerSafetyDeposit: '10000000', // 0.01 TON
    showAdvanced: false
}; 