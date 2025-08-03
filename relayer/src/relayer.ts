import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Cell, beginCell } from '@ton/core';
import { TonAdapter, TonAdapterConfig } from './adapters/TonAdapter';
import { 
    FusionOrder, 
    OrderStatus, 
    OrderPhase, 
    AssetType, 
    Network, 
    SecretData,
    RelayerConfig,
    RelayerError
} from './types';

// Server configuration interface
export interface ServerConfig {
    port: number;
    forwardEndpoint?: string; // Optional endpoint to forward orders to
}

// Request interface
export interface CreateOrderRequest {
    maker: string;
    taker?: string;
    makerAsset: {
        type: AssetType;
        address: string;
        amount: string; // String to handle large numbers from frontend
        network: Network;
    };
    takerAsset: {
        type: AssetType;
        address: string;
        amount: string;
        network: Network;
    };
    sourceChain: Network;
    destinationChain: Network;
    refundAddress: string;
    targetAddress: string;
    timelockDuration?: number;
    finalityTimelock?: number;
    exclusivePeriod?: number;
    makerSafetyDeposit?: string;
    takerSafetyDeposit?: string;
    secretHash?: string; // Optional secret hash from frontend
}

// New interfaces for secret handling
export interface SafeToSendSecretRequest {
    orderId: string;
    phase: OrderPhase;
}

export interface AcceptSecretRequest {
    orderId: string;
    secret: string;
    fromAddress?: string;
}

export class OrbisRelayerServer {
    private app: express.Application;
    private tonAdapter?: TonAdapter;
    private orders: Map<string, FusionOrder> = new Map();
    private secrets: Map<string, SecretData> = new Map();
    private server?: any;

    constructor(
        private relayerConfig: RelayerConfig,
        private serverConfig: ServerConfig
    ) {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        // CORS configuration
        this.app.use(cors({
            origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
            credentials: true
        }));

        // JSON parsing
        this.app.use(express.json({ limit: '10mb' }));

        // Request logging
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req: Request, res: Response) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                orders: this.orders.size
            });
        });

        // Main route - Process order and optionally forward
        this.app.post('/process-order', this.processOrder.bind(this));

        // Signal that it's safe to send secrets
        this.app.post('/signal-safe-to-send-secret', this.signalSafeToSendSecret.bind(this));

        // Accept secret and forward to another endpoint
        this.app.post('/accept-secret', this.acceptSecret.bind(this));

        // Error handling
        this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
            console.error('Server error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        });
    }

    async initialize(): Promise<void> {
        try {
            // Initialize TON adapter
            const tonConfig: TonAdapterConfig = {
                network: this.relayerConfig.tonNetwork,
                endpoint: this.relayerConfig.tonEndpoint,
                apiKey: this.relayerConfig.tonApiKey,
                mnemonic: this.relayerConfig.tonMnemonic,
                sourceEscrowCode: Cell.fromBase64(this.relayerConfig.tonSourceEscrowCode),
                destinationEscrowCode: Cell.fromBase64(this.relayerConfig.tonDestinationEscrowCode)
            };

            this.tonAdapter = new TonAdapter(tonConfig);
            await this.tonAdapter.initialize();

            console.log('Orbis Relayer Server initialized successfully');
            
        } catch (error) {
            throw new RelayerError(`Failed to initialize relayer server: ${error}`, 'INIT_ERROR');
        }
    }

    async start(): Promise<void> {
        await this.initialize();
        
        this.server = this.app.listen(this.serverConfig.port, () => {
            console.log(`🚀 Orbis Relayer Server running on port ${this.serverConfig.port}`);
            console.log(`📡 Health check: http://localhost:${this.serverConfig.port}/health`);
            console.log(`📋 Process order: POST http://localhost:${this.serverConfig.port}/process-order`);
            console.log(`🔐 Signal safe to send secret: POST http://localhost:${this.serverConfig.port}/signal-safe-to-send-secret`);
            console.log(`🤝 Accept secret: POST http://localhost:${this.serverConfig.port}/accept-secret`);
        });
    }

    async stop(): Promise<void> {
        if (this.server) {
            this.server.close();
            console.log('Orbis Relayer Server stopped');
        }
    }

    // === MAIN ROUTE HANDLER ===

    private async processOrder(req: Request, res: Response): Promise<void> {
        try {
            const orderRequest: CreateOrderRequest = req.body;
            
            // Validate required fields
            if (!orderRequest.maker || !orderRequest.makerAsset || !orderRequest.takerAsset) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: maker, makerAsset, takerAsset'
                });
                return;
            }

            if (!this.tonAdapter) {
                res.status(500).json({
                    success: false,
                    error: 'TON adapter not initialized'
                });
                return;
            }

            const orderId = this.generateOrderId();
            const now = Date.now();

            // Convert string amounts to BigInt
            const order: FusionOrder = {
                orderId,
                nonce: BigInt(now),
                maker: orderRequest.maker,
                taker: orderRequest.taker,
                resolver: this.tonAdapter.getWalletAddress(),
                makerAsset: {
                    ...orderRequest.makerAsset,
                    amount: BigInt(orderRequest.makerAsset.amount)
                },
                takerAsset: {
                    ...orderRequest.takerAsset,
                    amount: BigInt(orderRequest.takerAsset.amount)
                },
                sourceChain: orderRequest.sourceChain,
                destinationChain: orderRequest.destinationChain,
                refundAddress: orderRequest.refundAddress,
                targetAddress: orderRequest.targetAddress,
                secretHash: '',
                timelockDuration: orderRequest.timelockDuration || this.relayerConfig.defaultTimelockDuration,
                finalityTimelock: orderRequest.finalityTimelock || this.relayerConfig.defaultFinalityTimelock,
                exclusivePeriod: orderRequest.exclusivePeriod || this.relayerConfig.defaultExclusivePeriod,
                makerSafetyDeposit: orderRequest.makerSafetyDeposit ? BigInt(orderRequest.makerSafetyDeposit) : this.relayerConfig.minSafetyDeposit,
                takerSafetyDeposit: orderRequest.takerSafetyDeposit ? BigInt(orderRequest.takerSafetyDeposit) : undefined,
                status: OrderStatus.CREATED,
                phase: OrderPhase.ANNOUNCEMENT,
                createdAt: now,
                updatedAt: now
            };

            // Use provided secret hash or generate new one
            let secretData: SecretData;
            if (orderRequest.secretHash) {
                // Frontend provided secret hash
                order.secretHash = orderRequest.secretHash;
                secretData = {
                    secret: '', // Secret is kept on frontend
                    hash: orderRequest.secretHash,
                    revealed: false
                };
                console.log(`Using frontend-provided secret hash: ${orderRequest.secretHash}`);
            } else {
                // Generate secret on relayer (legacy behavior)
                secretData = this.tonAdapter.generateSecret();
                order.secretHash = secretData.hash;
                console.log(`Generated secret on relayer: ${secretData.hash}`);
            }
            this.secrets.set(orderId, secretData);

            // Validate order
            this.tonAdapter.validateOrder(order);

            // Deploy only source escrow contract for now
            console.log('🚀 Deploying source escrow contract...');
            const sourceAddress = await this.tonAdapter.deploySourceEscrow(order, secretData.hash);
            console.log(`✅ Source escrow deployed at: ${sourceAddress.toString()}`);

            // Wait 15 seconds for deployment and finality timelock
            console.log('⏳ Waiting 15 seconds for contract deployment and finality timelock...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            // Lock the source escrow
            console.log('🔐 Locking source escrow...');
            await this.tonAdapter.lockSourceEscrow(sourceAddress);
            console.log('✅ Source escrow locked successfully!');

            // Store order
            order.status = OrderStatus.DEPOSITED_SOURCE;
            order.phase = OrderPhase.DEPOSITING;
            order.updatedAt = Date.now();
            this.orders.set(orderId, order);

            // Prepare response
            const response = {
                success: true,
                orderId,
                order: this.serializeOrder(order),
                contracts: {
                    sourceEscrow: sourceAddress.toString(),
                    destinationEscrow: null // Only source for now
                },
                secret: {
                    hash: secretData.hash
                    // Don't expose actual secret
                }
            };

            res.status(201).json(response);

        } catch (error) {
            console.error('Error processing order:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to process order'
            });
        }
    }

    // === NEW SECRET HANDLING ENDPOINTS ===

    private async signalSafeToSendSecret(req: Request, res: Response): Promise<void> {
        try {
            const { orderId, phase }: SafeToSendSecretRequest = req.body;

            // Validate required fields
            if (!orderId || !phase) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: orderId, phase'
                });
                return;
            }

            // Check if order exists
            const order = this.orders.get(orderId);
            if (!order) {
                res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
                return;
            }

            // Update order phase to indicate it's safe to send secrets
            order.phase = phase;
            order.updatedAt = Date.now();
            this.orders.set(orderId, order);

            console.log(`Order ${orderId} marked as safe to send secrets in phase: ${phase}`);

            // Forward signal to configured endpoint if available
            if (this.serverConfig.forwardEndpoint) {
                try {
                    const forwardResponse = await fetch(`${this.serverConfig.forwardEndpoint}/signal-safe-to-send-secret`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId,
                            phase,
                            timestamp: new Date().toISOString()
                        })
                    });

                    if (!forwardResponse.ok) {
                        console.warn(`Failed to forward signal to ${this.serverConfig.forwardEndpoint}: ${forwardResponse.statusText}`);
                    }
                } catch (forwardError) {
                    console.warn(`Error forwarding signal to ${this.serverConfig.forwardEndpoint}:`, forwardError);
                }
            }

            res.json({
                success: true,
                orderId,
                phase,
                message: 'Signal sent successfully',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error signaling safe to send secret:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to signal safe to send secret'
            });
        }
    }

    private async acceptSecret(req: Request, res: Response): Promise<void> {
        try {
            const { orderId, secret, fromAddress }: AcceptSecretRequest = req.body;

            // Validate required fields
            if (!orderId || !secret) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: orderId, secret'
                });
                return;
            }

            // Check if order exists
            const order = this.orders.get(orderId);
            if (!order) {
                res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
                return;
            }

            // Verify secret matches the stored hash
            const storedSecretData = this.secrets.get(orderId);
            if (!storedSecretData) {
                res.status(404).json({
                    success: false,
                    error: 'Secret data not found for order'
                });
                return;
            }

            // Validate the secret (this would depend on your hashing implementation)
            if (!this.tonAdapter) {
                res.status(500).json({
                    success: false,
                    error: 'TON adapter not initialized'
                });
                return;
            }

            // Verify the secret matches the hash using the same logic as generateSecret
            const secretCell = beginCell()
                .storeUint(parseInt(secret.replace('0x', ''), 16), 32)
                .endCell();
            
            // Get cell hash and take first 32 bits (like contract does)
            const cellHashBuffer = secretCell.hash();
            const cellHashBigInt = BigInt('0x' + cellHashBuffer.toString('hex'));
            const hash32bit = Number(cellHashBigInt >> 224n); // Take first 32 bits
            const computedHash = hash32bit.toString(16).padStart(8, '0');
            
            const isValidSecret = computedHash === order.secretHash;
            if (!isValidSecret) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid secret provided'
                });
                return;
            }

            // Update order status to indicate secret has been received
            order.phase = OrderPhase.WITHDRAWAL;
            order.status = OrderStatus.SECRETS_SHARED;
            order.updatedAt = Date.now();
            this.orders.set(orderId, order);

            console.log(`Secret accepted for order ${orderId} from ${fromAddress || 'unknown'}`);

            // Forward secret to configured endpoint if available
            let forwardResult = null;
            if (this.serverConfig.forwardEndpoint) {
                try {
                    const forwardResponse = await fetch(`${this.serverConfig.forwardEndpoint}/accept-secret`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId,
                            secret,
                            fromAddress,
                            timestamp: new Date().toISOString(),
                            orderPhase: order.phase,
                            orderStatus: order.status
                        })
                    });

                    if (forwardResponse.ok) {
                        forwardResult = await forwardResponse.json();
                        console.log(`Successfully forwarded secret for order ${orderId}`);
                    } else {
                        console.warn(`Failed to forward secret to ${this.serverConfig.forwardEndpoint}: ${forwardResponse.statusText}`);
                        forwardResult = { error: `Forward failed: ${forwardResponse.statusText}` };
                    }
                } catch (forwardError) {
                    console.warn(`Error forwarding secret to ${this.serverConfig.forwardEndpoint}:`, forwardError);
                    forwardResult = { error: `Forward error: ${forwardError}` };
                }
            }

            res.json({
                success: true,
                orderId,
                message: 'Secret accepted successfully',
                order: {
                    phase: order.phase,
                    status: order.status,
                    updatedAt: order.updatedAt
                },
                forwardResult,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error accepting secret:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to accept secret'
            });
        }
    }

    // === UTILITY METHODS ===

    private generateOrderId(): string {
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Serialize order for JSON response (convert BigInt to string)
    private serializeOrder(order: FusionOrder): any {
        return {
            ...order,
            nonce: order.nonce.toString(),
            makerAsset: {
                ...order.makerAsset,
                amount: order.makerAsset.amount.toString()
            },
            takerAsset: {
                ...order.takerAsset,
                amount: order.takerAsset.amount.toString()
            },
            makerSafetyDeposit: order.makerSafetyDeposit.toString(),
            takerSafetyDeposit: order.takerSafetyDeposit?.toString()
        };
    }
}
