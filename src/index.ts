/**
 * TON Fusion+ SDK - Main Entry Point
 * 
 * This SDK provides integration between 1inch Fusion+ protocol and TON blockchain,
 * enabling intent-based atomic cross-chain swaps with professional resolvers.
 */

// Core exports
export * from './ton-escrow-sdk';

// Version information
export const VERSION = '1.0.0';

// Protocol constants
export const PROTOCOL_CONSTANTS = {
    DEFAULT_TIMELOCK_DURATION: 3600, // 1 hour
    DEFAULT_FINALITY_TIMELOCK: 600,  // 10 minutes  
    DEFAULT_EXCLUSIVE_PERIOD: 1800,  // 30 minutes
    MIN_SAFETY_DEPOSIT: 100000000n,  // 0.1 TON
    DEFAULT_GAS_AMOUNT: 100000000n,  // 0.1 TON for gas
} as const;

// Network configurations
export const TON_NETWORKS = {
    MAINNET: {
        name: 'mainnet',
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
        explorer: 'https://tonscan.org',
    },
    TESTNET: {
        name: 'testnet', 
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        explorer: 'https://testnet.tonscan.org',
    },
} as const;

// Utility functions
export const utils = {
    /**
     * Convert TON amount to nanotons
     */
    toNano: (amount: string | number): bigint => {
        const amountStr = amount.toString();
        const [integer, decimal = ''] = amountStr.split('.');
        const paddedDecimal = decimal.padEnd(9, '0').slice(0, 9);
        return BigInt(integer + paddedDecimal);
    },

    /**
     * Convert nanotons to TON amount
     */
    fromNano: (nanotons: bigint): string => {
        const str = nanotons.toString().padStart(10, '0');
        const integer = str.slice(0, -9) || '0';
        const decimal = str.slice(-9).replace(/0+$/, '');
        return decimal ? `${integer}.${decimal}` : integer;
    },

    /**
     * Generate a random secret for HTLC
     */
    generateSecret: (): string => {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            // Node.js fallback
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Validate TON address format
     */
    isValidTONAddress: (address: string): boolean => {
        // Basic validation - should be enhanced with proper TON address validation
        return /^(0:)?[0-9a-fA-F]{64}$/.test(address) || 
               /^[A-Za-z0-9_-]+$/.test(address); // For DNS names
    },

    /**
     * Format timelock duration for display
     */
    formatDuration: (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },
};

// Error classes
export class TONFusionError extends Error {
    constructor(message: string, public readonly code?: string) {
        super(message);
        this.name = 'TONFusionError';
    }
}

export class EscrowError extends TONFusionError {
    constructor(message: string, public readonly escrowAddress?: string) {
        super(message, 'ESCROW_ERROR');
        this.name = 'EscrowError';
    }
}

export class ResolverError extends TONFusionError {
    constructor(message: string, public readonly resolverAddress?: string) {
        super(message, 'RESOLVER_ERROR'); 
        this.name = 'ResolverError';
    }
}

// Default export
export default {
    VERSION,
    PROTOCOL_CONSTANTS,
    TON_NETWORKS,
    utils,
    TONFusionError,
    EscrowError,
    ResolverError,
}; 