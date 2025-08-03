/**
 * Types for TON Fusion+ Resolver
 */

export interface ResolverConfig {
    ton: {
        rpcUrl: string;
        apiKey: string;
        privateKey: string;
        sourceEscrowTemplate: string;
        destinationEscrowTemplate: string;
    };
    evm: {
        rpcUrl: string;
        privateKey: string;
        chainId: number;
        escrowFactory: string;
    };
    fusion: {
        apiUrl: string;
        apiKey: string;
    };
    resolver: {
        minProfitThreshold: string;
        maxGasPrice: string;
        timeoutSeconds: number;
    };
}

export interface CrossChainSwapOrder {
    orderId: string;
    maker: string;
    sourceChain: 'ton' | 'evm';
    destinationChain: 'ton' | 'evm';
    fromToken: string;
    toToken: string;
    amount: string;
    minReceiveAmount: string;
    secretHash: string;
    timelock: number;
    makerAddress: string;
    resolverFee: string;
    deadline: number;
}

export interface EscrowDeployment {
    chain: 'ton' | 'evm';
    contractAddress: string;
    transactionHash: string;
    secretHash: string;
    amount: string;
    timelock: number;
    deployer: string;
    status: EscrowStatus;
}

export enum EscrowStatus {
    PENDING = 'pending',
    DEPLOYED = 'deployed',
    LOCKED = 'locked',
    EXECUTED = 'executed',
    REFUNDED = 'refunded',
    FAILED = 'failed'
}

export interface SwapExecution {
    orderId: string;
    sourceEscrow: EscrowDeployment;
    destinationEscrow: EscrowDeployment;
    secret: string;
    secretHash: string;
    executionStatus: ExecutionStatus;
    profit: string;
    gasUsed: string;
    completedAt?: number;
}

export enum ExecutionStatus {
    INITIATED = 'initiated',
    SOURCE_LOCKED = 'source_locked',
    DEST_LOCKED = 'dest_locked',
    EXECUTING = 'executing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDING = 'refunding',
    REFUNDED = 'refunded'
}

export class ResolverError extends Error {
    code: string;
    orderId?: string;
    chain?: string;

    constructor(message: string, options: { code?: string; orderId?: string; chain?: string } = {}) {
        super(message);
        this.name = 'ResolverError';
        this.code = options.code || 'UNKNOWN_ERROR';
        this.orderId = options.orderId;
        this.chain = options.chain;
    }
}

export interface ResolverNotification {
    type: 'order_received' | 'escrow_deployed' | 'swap_executed' | 'profit_realized';
    orderId: string;
    data: any;
    timestamp: number;
}