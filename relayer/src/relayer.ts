import { Cell } from '@ton/core';
import { TonAdapter, TonAdapterConfig } from './adapters/TonAdapter';
import { 
    FusionOrder, 
    OrderStatus, 
    OrderPhase, 
    AssetType, 
    Network, 
    SecretData,
    RelayerConfig,
    RelayerEvent,
    RelayerError
} from './types';

export class OrbisRelayer {
    private tonAdapter?: TonAdapter;
    private orders: Map<string, FusionOrder> = new Map();
    private secrets: Map<string, SecretData> = new Map();
    private eventListeners: ((event: RelayerEvent) => void)[] = [];

    constructor(private config: RelayerConfig) {}

    async initialize(): Promise<void> {
        try {
            // Initialize TON adapter
            const tonConfig: TonAdapterConfig = {
                network: this.config.tonNetwork,
                endpoint: this.config.tonEndpoint,
                apiKey: this.config.tonApiKey,
                mnemonic: this.config.tonMnemonic,
                sourceEscrowCode: Cell.fromBase64(this.config.tonSourceEscrowCode),
                destinationEscrowCode: Cell.fromBase64(this.config.tonDestinationEscrowCode)
            };

            this.tonAdapter = new TonAdapter(tonConfig);
            await this.tonAdapter.initialize();

            console.log('Orbis Relayer initialized successfully');
            
        } catch (error) {
            throw new RelayerError(`Failed to initialize relayer: ${error}`, 'INIT_ERROR');
        }
    }

    // === ORDER MANAGEMENT ===

    createOrder(orderParams: Partial<FusionOrder>): FusionOrder {
        const orderId = this.generateOrderId();
        const now = Date.now();

        const order: FusionOrder = {
            orderId,
            nonce: BigInt(now),
            maker: orderParams.maker || '',
            taker: orderParams.taker,
            resolver: this.tonAdapter?.formatAddress('') || '', // Will be set after adapter init
            makerAsset: orderParams.makerAsset || {
                type: AssetType.NATIVE_TON,
                address: 'TON',
                amount: BigInt(0),
                network: Network.TON_TESTNET
            },
            takerAsset: orderParams.takerAsset || {
                type: AssetType.NATIVE_ETH,
                address: 'ETH',
                amount: BigInt(0),
                network: Network.ETHEREUM_SEPOLIA
            },
            sourceChain: orderParams.sourceChain || Network.TON_TESTNET,
            destinationChain: orderParams.destinationChain || Network.ETHEREUM_SEPOLIA,
            refundAddress: orderParams.refundAddress || orderParams.maker || '',
            targetAddress: orderParams.targetAddress || '',
            secretHash: '',
            timelockDuration: orderParams.timelockDuration || this.config.defaultTimelockDuration,
            finalityTimelock: orderParams.finalityTimelock || this.config.defaultFinalityTimelock,
            exclusivePeriod: orderParams.exclusivePeriod || this.config.defaultExclusivePeriod,
            makerSafetyDeposit: orderParams.makerSafetyDeposit || this.config.minSafetyDeposit,
            takerSafetyDeposit: orderParams.takerSafetyDeposit,
            status: OrderStatus.CREATED,
            phase: OrderPhase.ANNOUNCEMENT,
            createdAt: now,
            updatedAt: now
        };

        // Generate secret and hash
        const secretData = this.tonAdapter?.generateSecret();
        if (secretData) {
            order.secretHash = secretData.hash;
            this.secrets.set(orderId, secretData);
        }

        this.orders.set(orderId, order);
        this.emitEvent({
            type: 'order_created',
            orderId,
            timestamp: now,
            data: order
        });

        return order;
    }

    getOrder(orderId: string): FusionOrder | undefined {
        return this.orders.get(orderId);
    }

    updateOrderStatus(orderId: string, status: OrderStatus, phase?: OrderPhase): void {
        const order = this.orders.get(orderId);
        if (!order) {
            throw new RelayerError(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND', orderId);
        }

        order.status = status;
        if (phase) order.phase = phase;
        order.updatedAt = Date.now();

        this.orders.set(orderId, order);
        this.emitEvent({
            type: 'order_signed',
            orderId,
            timestamp: order.updatedAt,
            data: { status, phase }
        });
    }

    // === CROSS-CHAIN OPERATIONS ===

    async processOrder(orderId: string): Promise<void> {
        const order = this.getOrder(orderId);
        if (!order) {
            throw new RelayerError(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND', orderId);
        }

        if (!this.tonAdapter) {
            throw new RelayerError('TON adapter not initialized', 'ADAPTER_NOT_READY', orderId);
        }

        try {
            // Validate order
            this.tonAdapter.validateOrder(order);

            // Phase 1: Announcement - Deploy contracts
            if (order.phase === OrderPhase.ANNOUNCEMENT) {
                await this.deployEscrowContracts(order);
                this.updateOrderStatus(orderId, OrderStatus.DEPOSITED_SOURCE, OrderPhase.DEPOSITING);
            }

            console.log(`Order ${orderId} processed successfully`);

        } catch (error) {
            this.updateOrderStatus(orderId, OrderStatus.FAILED);
            this.emitEvent({
                type: 'error',
                orderId,
                timestamp: Date.now(),
                data: { error: error instanceof Error ? error.message : String(error) }
            });
            throw error;
        }
    }

    private async deployEscrowContracts(order: FusionOrder): Promise<void> {
        if (!this.tonAdapter) throw new Error('TON adapter not initialized');

        const secret = this.secrets.get(order.orderId);
        if (!secret) {
            throw new RelayerError(`Secret not found for order: ${order.orderId}`, 'SECRET_NOT_FOUND', order.orderId);
        }

        try {
            // Deploy source escrow (where maker deposits)
            if (order.sourceChain === Network.TON_TESTNET || order.sourceChain === Network.TON_MAINNET) {
                const sourceAddress = await this.tonAdapter.deploySourceEscrow(order, secret.hash);
                console.log(`Source escrow deployed: ${sourceAddress.toString()}`);
            }

            // Deploy destination escrow (where taker receives)
            if (order.destinationChain === Network.TON_TESTNET || order.destinationChain === Network.TON_MAINNET) {
                const destAddress = await this.tonAdapter.deployDestinationEscrow(order, secret.hash);
                console.log(`Destination escrow deployed: ${destAddress.toString()}`);
            }

            this.emitEvent({
                type: 'deposit_detected',
                orderId: order.orderId,
                timestamp: Date.now(),
                data: { phase: 'contracts_deployed' }
            });

        } catch (error) {
            throw new RelayerError(`Failed to deploy escrow contracts: ${error}`, 'DEPLOYMENT_FAILED', order.orderId);
        }
    }

    // === SECRET MANAGEMENT ===

    revealSecret(orderId: string): string | undefined {
        const secret = this.secrets.get(orderId);
        if (!secret) return undefined;

        secret.revealed = true;
        secret.revealedAt = Date.now();
        this.secrets.set(orderId, secret);

        this.emitEvent({
            type: 'secret_shared',
            orderId,
            timestamp: secret.revealedAt,
            data: { secret: secret.secret }
        });

        return secret.secret;
    }

    getSecret(orderId: string): SecretData | undefined {
        return this.secrets.get(orderId);
    }

    // === EVENT SYSTEM ===

    addEventListener(listener: (event: RelayerEvent) => void): void {
        this.eventListeners.push(listener);
    }

    removeEventListener(listener: (event: RelayerEvent) => void): void {
        const index = this.eventListeners.indexOf(listener);
        if (index > -1) {
            this.eventListeners.splice(index, 1);
        }
    }

    private emitEvent(event: RelayerEvent): void {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    // === UTILITY METHODS ===

    private generateOrderId(): string {
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getAllOrders(): FusionOrder[] {
        return Array.from(this.orders.values());
    }

    getOrdersByStatus(status: OrderStatus): FusionOrder[] {
        return Array.from(this.orders.values()).filter(order => order.status === status);
    }

    async cleanup(): Promise<void> {
        // Clean up resources, close connections, etc.
        this.orders.clear();
        this.secrets.clear();
        this.eventListeners.length = 0;
        console.log('Relayer cleanup completed');
    }
} 