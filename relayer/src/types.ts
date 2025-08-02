/**
 * Simple types for TON Fusion+ relayer
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
    CANCELLED = 'cancelled'
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

export interface RelayerError extends Error {
    code: string;
    chain?: string;
    orderId?: string;
}