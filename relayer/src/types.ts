/**
 * Types for TON Fusion+ relayer (event listener, not resolver)
 */

export interface RelayerConfig {
    ton: {
        rpcUrl: string;
        apiKey: string;
        privateKey: string;
        sourceEscrow: string;
        destinationEscrow: string;
    };
    evm: {
        rpcUrl: string;
        privateKey: string;
        chainId: number;
        resolverContract: string;
    };
    fusion: {
        apiUrl: string;
        apiKey: string;
    };
    relayer: {
        pollInterval: number;
        timeoutBuffer: number;
        minSafetyDeposit: string;
    };
}

export interface CrossChainOrder {
    orderId: string;
    maker: string;
    sourceChain: 'ton' | 'evm';
    destinationChain: 'ton' | 'evm';
    fromToken: string;
    toToken: string;
    amount: string;
    secretHash: string;
    timelock: number;
    status: OrderStatus;
    createdAt: number;
}

export enum OrderStatus {
    CREATED = 'created',
    ESCROWS_DEPLOYED = 'escrows_deployed',
    LOCKED = 'locked',
    PARTIALLY_FILLED = 'partially_filled',
    COMPLETED = 'completed',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
    FAILED = 'failed'
}

export interface EscrowDetails {
    escrowId: string;
    chain: 'ton' | 'evm';
    contractAddress: string;
    amount: string;
    secretHash: string;
    timelock: number;
    status: EscrowStatus;
}

export enum EscrowStatus {
    CREATED = 1,
    LOCKED = 2,
    WITHDRAWN = 3,
    REFUNDED = 4,
    EXPIRED = 5
}

export interface SecretData {
    secret: string;
    hash: string;
    merkleRoot?: string;
    merkleProof?: string[];
}

export class RelayerError extends Error {
    code: string;
    chain?: string;
    orderId?: string;

    constructor(message: string, options: { code?: string; chain?: string; orderId?: string } = {}) {
        super(message);
        this.name = 'RelayerError';
        this.code = options.code || 'UNKNOWN_ERROR';
        this.chain = options.chain;
        this.orderId = options.orderId;
    }
}

export interface RelayerEvent {
    type: 'escrow_created' | 'escrow_withdrawal' | 'escrow_refund' | 'order_timeout' | 'fusion_order';
    escrowType?: 'source' | 'destination';
    orderId?: string;
    transaction?: string;
    timestamp: number;
    data?: any;
}

export interface RelayerNotification {
    resolver: string;
    event: RelayerEvent;
    retries: number;
    lastAttempt: number;
}