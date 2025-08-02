import { config as dotenvConfig } from 'dotenv';
import { RelayerConfig } from './types';

// Load environment variables
dotenvConfig();

export const config: RelayerConfig = {
    ton: {
        rpcUrl: process.env.TON_RPC_URL || 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TON_API_KEY || '',
        privateKey: process.env.TON_PRIVATE_KEY || '',
        sourceEscrow: process.env.TON_SOURCE_ESCROW || '',
        destinationEscrow: process.env.TON_DESTINATION_ESCROW || ''
    },
    evm: {
        rpcUrl: process.env.EVM_RPC_URL || '',
        privateKey: process.env.EVM_PRIVATE_KEY || '',
        chainId: parseInt(process.env.EVM_CHAIN_ID || '11155111'),
        resolverContract: process.env.EVM_RESOLVER_CONTRACT || ''
    },
    fusion: {
        apiUrl: process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion',
        apiKey: process.env.FUSION_API_KEY || ''
    },
    relayer: {
        pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
        timeoutBuffer: parseInt(process.env.TIMEOUT_BUFFER || '300'),
        minSafetyDeposit: process.env.MIN_SAFETY_DEPOSIT || '1000000000'
    }
};

export function validateConfig(): void {
    const required = [
        'TON_PRIVATE_KEY',
        'EVM_PRIVATE_KEY',
        'EVM_RPC_URL',
        'FUSION_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}