import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Cell, beginCell } from '@ton/core';
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



export class OrbisRelayerServer {
    private app: express.Application;
    private server?: any;

    constructor(
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
                forwardEndpoint: this.serverConfig.forwardEndpoint
            });
        });

        // Main route - Process order
        this.app.post('/process-order', this.processOrder.bind(this));

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

            // Forward order to resolver
            if (this.serverConfig.forwardEndpoint) {
                try {
                    console.log(`📤 Forwarding order to resolver: ${this.serverConfig.forwardEndpoint}/processordertontoevm`);
                    
                    const forwardResponse = await fetch(`${this.serverConfig.forwardEndpoint}/processordertontoevm`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(orderRequest)
                    });

                    if (forwardResponse.ok) {
                        const resolverResult = await forwardResponse.json();
                        console.log(`✅ Order successfully forwarded to resolver`);
                        
                        // Return the resolver's response
                        res.status(forwardResponse.status).json(resolverResult);
                    } else {
                        const errorText = await forwardResponse.text();
                        console.error(`❌ Failed to forward order to resolver: ${forwardResponse.status} ${forwardResponse.statusText}`);
                        console.error(`Error details: ${errorText}`);
                        
                        res.status(502).json({
                            success: false,
                            error: `Failed to forward order to resolver: ${forwardResponse.statusText}`,
                            details: errorText
                        });
                    }
                } catch (forwardError) {
                    console.error(`❌ Error forwarding order to resolver:`, forwardError);
                    res.status(502).json({
                        success: false,
                        error: 'Failed to connect to resolver',
                        details: forwardError instanceof Error ? forwardError.message : 'Unknown error'
                    });
                }
            } else {
                res.status(500).json({
                    success: false,
                    error: 'No resolver endpoint configured. Please set forwardEndpoint in server config.'
                });
            }

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
