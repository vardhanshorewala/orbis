import dotenv from 'dotenv';
import { ResolverConfig } from './types';

dotenv.config();

/**
 * Load resolver configuration from environment
 */
export function loadConfig(): ResolverConfig {
    const config: ResolverConfig = {
        ton: {
            rpcUrl: process.env.TON_RPC_URL || 'https://testnet.toncenter.com/api/v2/jsonRPC',
            apiKey: process.env.TON_API_KEY || 'demo_key',
            privateKey: process.env.TON_MNEMONIC || process.env.TON_PRIVATE_KEY || 'word1 word2 word3 ... word24',
            sourceEscrowTemplate: process.env.TON_SOURCE_ESCROW_TEMPLATE || 'EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqxa',
            destinationEscrowTemplate: process.env.TON_DESTINATION_ESCROW_TEMPLATE || 'EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqxb'
        },
        evm: {
            rpcUrl: process.env.EVM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
            privateKey: process.env.EVM_PRIVATE_KEY || '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            chainId: parseInt(process.env.EVM_CHAIN_ID || '11155111'),
            escrowFactory: process.env.EVM_ESCROW_FACTORY || '0x1234567890123456789012345678901234567890'
        },
        fusion: {
            apiUrl: process.env.FUSION_API_URL || 'https://api.1inch.dev/fusion',
            apiKey: process.env.FUSION_API_KEY || 'demo_api_key'
        },
        resolver: {
            minProfitThreshold: process.env.MIN_PROFIT_THRESHOLD || '1000000', // 1 USDC in wei
            maxGasPrice: process.env.MAX_GAS_PRICE || '50000000000', // 50 gwei
            timeoutSeconds: parseInt(process.env.TIMEOUT_SECONDS || '1800') // 30 minutes
        }
    };

    return config;
}

/**
 * Validate resolver configuration
 */
export function validateConfig(config: ResolverConfig): void {
    const errors: string[] = [];

    // Validate TON config
    if (!config.ton.rpcUrl) {
        errors.push('TON_RPC_URL is required');
    }
    if (!config.ton.privateKey || config.ton.privateKey.split(' ').length !== 24) {
        errors.push('TON_PRIVATE_KEY must be a 24-word mnemonic');
    }

    // Validate EVM config
    if (!config.evm.rpcUrl) {
        errors.push('EVM_RPC_URL is required');
    }
    if (!config.evm.privateKey || !config.evm.privateKey.startsWith('0x')) {
        errors.push('EVM_PRIVATE_KEY must be a hex string starting with 0x');
    }
    if (!config.evm.chainId || config.evm.chainId <= 0) {
        errors.push('EVM_CHAIN_ID must be a positive number');
    }

    // Validate Fusion config
    if (!config.fusion.apiUrl) {
        errors.push('FUSION_API_URL is required');
    }
    if (!config.fusion.apiKey) {
        errors.push('FUSION_API_KEY is required');
    }

    // Validate resolver config
    if (!config.resolver.minProfitThreshold) {
        errors.push('MIN_PROFIT_THRESHOLD is required');
    }
    if (!config.resolver.maxGasPrice) {
        errors.push('MAX_GAS_PRICE is required');
    }
    if (!config.resolver.timeoutSeconds || config.resolver.timeoutSeconds <= 0) {
        errors.push('TIMEOUT_SECONDS must be a positive number');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
}

/**
 * Get sample environment file content
 */
export function getSampleEnv(): string {
    return `# TON Configuration
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_ton_api_key_here
TON_PRIVATE_KEY="word1 word2 word3 ... word24"
TON_SOURCE_ESCROW_TEMPLATE=EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqxa
TON_DESTINATION_ESCROW_TEMPLATE=EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqxb

# EVM Configuration
EVM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
EVM_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
EVM_CHAIN_ID=11155111
EVM_ESCROW_FACTORY=0x1234567890123456789012345678901234567890

# 1inch Fusion
FUSION_API_URL=https://api.1inch.dev/fusion
FUSION_API_KEY=your_1inch_dev_portal_api_key

# Resolver Settings
MIN_PROFIT_THRESHOLD=1000000
MAX_GAS_PRICE=50000000000
TIMEOUT_SECONDS=1800

# Logging
LOG_LEVEL=info`;
}