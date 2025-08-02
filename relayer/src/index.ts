#!/usr/bin/env node

import { TonFusionRelayer } from './relayer';
import { config, validateConfig } from './config';
import { Logger } from './utils';

/**
 * Main entry point for TON Fusion+ Relayer
 */
async function main() {
    try {
        // Validate configuration
        validateConfig();

        Logger.info('Starting TON Fusion+ Relayer...');
        Logger.info('Configuration loaded', {
            tonRpc: config.ton.rpcUrl,
            evmChainId: config.evm.chainId,
            fusionApi: config.fusion.apiUrl
        });

        // Create and start relayer
        const relayer = new TonFusionRelayer(config);
        await relayer.start();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            Logger.info('Received SIGINT, shutting down gracefully...');
            await relayer.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            Logger.info('Received SIGTERM, shutting down gracefully...');
            await relayer.stop();
            process.exit(0);
        });

        Logger.info('Relayer is running. Press Ctrl+C to stop.');

    } catch (error) {
        Logger.error('Failed to start relayer', { error: error.message });
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}

export { TonFusionRelayer } from './relayer';
export * from './types';
export * from './utils';