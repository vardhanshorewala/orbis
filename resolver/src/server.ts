import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Cell, beginCell } from '@ton/core';
import { JsonRpcProvider, Wallet, keccak256, AbiCoder } from 'ethers';
import { TonAdapter, TonAdapterConfig } from './adapters/TonAdapter';
import { EvmAdapter, EscrowImmutables, CrossChainSwapConfig } from './adapters/EvmAdapter';
import { loadConfig } from './config';
import { 
    FusionOrder, 
    OrderStatus, 
    OrderPhase, 
    AssetType, 
    Network, 
    SecretData,
    RelayerConfig,
    RelayerError
} from './typeston';
import { randomBytes } from 'crypto';
import { parseEther } from 'ethers';

// Server configuration interface
export interface ServerConfig {
    port: number;
}

function addressToUint256(address: string): bigint {
    return BigInt(address);
}

// Helper to create a demo order
function createDemoOrder(maker: string, taker: string) {
    const secret = '0x' + randomBytes(32).toString('hex');
    const secretHash = keccak256(secret);
    const orderId = `same_chain_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const orderHash = keccak256(Buffer.from(orderId));

    return {
        orderId,
        orderHash,
        secret,
        secretHash,
        maker,
        taker,
        amount: parseEther('0.00001'), // 0.0001 ETH
        safetyDeposit: parseEther('0.00001'), // 0.00001 ETH safety deposit
        timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
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
    private evmAdapter?: EvmAdapter;
    private evmWallet?: Wallet;
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
        this.app.post('/processordertontoevm', this.processOrder.bind(this));

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

            // Initialize EVM adapter
            const config = loadConfig();
            const evmProvider = new JsonRpcProvider(config.evm.rpcUrl);
            
            // Create EVM wallet using config
            if (config.evm.mnemonic) {
                const hdWallet = Wallet.fromPhrase(config.evm.mnemonic);
                this.evmWallet = new Wallet(hdWallet.privateKey, evmProvider);
            } else {
                this.evmWallet = new Wallet(config.evm.privateKey || '', evmProvider);
            }
            
            const swapConfig: CrossChainSwapConfig = {
                escrowFactoryAddress: config.evm.escrowFactory,
                sourceChainId: config.evm.chainId,
                destinationChainId: config.evm.chainId,
            };
            
            this.evmAdapter = new EvmAdapter(evmProvider, swapConfig);

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
                console.log('Generating secret on relayer');
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
                    destinationEscrow: null as string | null
                },
                secret: {
                    hash: secretData.hash
                    // Don't expose actual secret
                }
            };
            const config = loadConfig();

            // Set up providers and wallets
            const provider = new JsonRpcProvider(config.evm.rpcUrl);
            const chainId = await provider.getNetwork().then(n => Number(n.chainId));

            // Create wallets for maker and taker (using same wallet for demo)
            let wallet: Wallet;
            if (config.evm.mnemonic) {
                const hdWallet = Wallet.fromPhrase(config.evm.mnemonic);
                wallet = new Wallet(hdWallet.privateKey, provider);
            } else {
                wallet = new Wallet(config.evm.privateKey || '', provider);
            }

            const makerAddress = wallet.address;
            const takerAddress = wallet.address; // Same for demo



            // Check balance
            const balance = await provider.getBalance(makerAddress);

            // if (balance < parseEther('0.05')) {
            //     throw new Error('Insufficient balance. Need at least 0.05 ETH for demo');
            // }

            // Create adapter
            const swapConfig: CrossChainSwapConfig = {
                escrowFactoryAddress: config.evm.escrowFactory || '0x0000000000000000000000000000000000000000',
                sourceChainId: chainId,
                destinationChainId: chainId, // Same chain for demo
            };

            const adapter = new EvmAdapter(provider, swapConfig);

            // Create demo order
            const order2 = createDemoOrder(makerAddress, takerAddress);

            // // ----------------------------------------------------------------------------
            // // SCENARIO 1: Source Escrow (Maker locks funds, Taker withdraws with secret)
            // // ----------------------------------------------------------------------------
            // Logger.info(chalk.yellow('\n=== SCENARIO 1: Source Escrow Flow ===\n'));

            // // Step 1: Calculate source escrow address
            // // For the demo, we'll use zero fees
            const protocolFeeAmount = 0n;
            const integratorFeeAmount = 0n;
            const protocolFeeRecipient = addressToUint256('0x0000000000000000000000000000000000000000');
            const integratorFeeRecipient = addressToUint256('0x0000000000000000000000000000000000000000');

            // // Encode the parameters field as the contract expects
            const abiCoder = new AbiCoder();
            const parameters = abiCoder.encode(
                ['uint256', 'uint256', 'uint256', 'uint256'],
                [protocolFeeAmount, integratorFeeAmount, protocolFeeRecipient, integratorFeeRecipient]
            );

            const srcImmutables: EscrowImmutables = {
                orderHash: order2.orderHash,
                hashlock: order2.secretHash,
                maker: addressToUint256(makerAddress),
                taker: addressToUint256(takerAddress),
                token: 0n, // Native ETH
                amount: order2.amount,
                safetyDeposit: order2.safetyDeposit,
                timelocks: BigInt(order2.timelock),
                parameters: parameters,
            };

            const srcEscrowAddress = await adapter.getSourceEscrowAddress(srcImmutables);
            console.log('srcEscrowAddress', srcEscrowAddress);

            // Step 2: Maker sends funds to source escrow
            const srcFundTx = await wallet.sendTransaction({
                to: srcEscrowAddress,
                value: order2.amount + order2.safetyDeposit,
            });
            await srcFundTx.wait();
            console.log('srcFundTx', srcFundTx);

            // Check escrow balance
            const escrowBalance = await provider.getBalance(srcEscrowAddress);
            console.log('escrowBalance', escrowBalance);

            // Step 3: Taker withdraws using secret
            const withdrawResult = await adapter.withdrawFromSourceEscrow(
                wallet,
                srcEscrowAddress,
                order2.secret,
                srcImmutables
            );
            console.log('withdrawResult', withdrawResult);
            

        } catch (error) {
            console.error('Error processing order:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to process order'
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

// Export alias for backwards-compatibility with example.ts
export { OrbisRelayerServer as OrbisResolverServer };