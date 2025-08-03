import type { CreateOrderRequest, CreateOrderResponse } from '../types/relayer';

const RELAYER_BASE_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

/**
 * API client for communicating with the Orbis Relayer Server
 */
export class RelayerAPI {
    private baseUrl: string;

    constructor(baseUrl: string = RELAYER_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Check if the relayer server is healthy
     */
    async checkHealth(): Promise<{ status: string; timestamp: string; orders: number }> {
        const response = await fetch(`${this.baseUrl}/health`);
        
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.statusText}`);
        }
        
        return response.json();
    }

    /**
     * Create a new order on the relayer
     */
    async createOrder(orderRequest: CreateOrderRequest): Promise<CreateOrderResponse> {
        const response = await fetch(`${this.baseUrl}/process-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderRequest),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Failed to create order: ${response.statusText}`);
        }

        return result;
    }

    /**
     * Create a new EVM to TON order on the relayer
     */
    async createEvmToTonOrder(orderRequest: CreateOrderRequest): Promise<CreateOrderResponse> {
        const response = await fetch(`${this.baseUrl}/processorderevmtoton`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderRequest),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Failed to create EVM to TON order: ${response.statusText}`);
        }

        return result;
    }

    /**
     * Signal that it's safe to send secrets for an order
     */
    async signalSafeToSendSecret(orderId: string, phase: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/signal-safe-to-send-secret`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId, phase }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || `Failed to signal safe to send secret: ${response.statusText}`);
        }
    }

    /**
     * Send a secret to the relayer
     */
    async acceptSecret(orderId: string, secret: string, fromAddress?: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/accept-secret`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId, secret, fromAddress }),
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || `Failed to accept secret: ${response.statusText}`);
        }
    }
}

// Default instance
export const relayerAPI = new RelayerAPI();

/**
 * Helper function to format error messages from the relayer
 */
export function formatRelayerError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    
    if (typeof error === 'string') {
        return error;
    }
    
    return 'An unknown error occurred while communicating with the relayer';
} 