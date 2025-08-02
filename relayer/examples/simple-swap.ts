#!/usr/bin/env node

/**
 * Simple example of TON Fusion+ cross-chain swap
 * 
 * This demonstrates:
 * 1. Creating a cross-chain order
 * 2. Monitoring swap progress  
 * 3. Handling completion/errors
 */

import { TonFusionRelayer } from '../src/relayer';
import { config } from '../src/config';
import { Logger } from '../src/utils';
import { OrderStatus } from '../src/types';

async function runSimpleSwap() {
    try {
        Logger.info('=== TON Fusion+ Simple Swap Example ===');

        // Initialize relayer
        const relayer = new TonFusionRelayer(config);

        // Start relayer service
        Logger.info('Starting relayer...');
        await relayer.start();

        // Create a test swap: TON → USDC
        Logger.info('Creating cross-chain order...');
        const order = await relayer.createOrder({
            sourceChain: 'ton',
            destinationChain: 'evm',
            fromToken: 'TON',
            toToken: '0xA0b86a33E6C100C10E8BD25E70e633c6E1976E08', // USDC on Ethereum
            amount: '1000000000', // 1 TON (9 decimals)
            maker: 'EQDrLq-Q2xJd-tdHPCNVa_bpALCYDxp6EXHw0PIIlGNEChEk' // Example TON address
        });

        Logger.info('Order created successfully', {
            orderId: order.orderId,
            status: order.status,
            secretHash: order.secretHash.substring(0, 10) + '...'
        });

        // Monitor order progress
        Logger.info('Monitoring order progress...');
        await monitorOrder(relayer, order.orderId);

        Logger.info('=== Swap Example Completed ===');

    } catch (error) {
        Logger.error('Swap example failed', { error: error.message });
        process.exit(1);
    }
}

async function monitorOrder(relayer: TonFusionRelayer, orderId: string): Promise<void> {
    const maxWait = 300000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
        const order = relayer.getOrder(orderId);

        if (!order) {
            Logger.error('Order not found', { orderId });
            return;
        }

        Logger.info('Order status update', {
            orderId,
            status: order.status,
            elapsed: Math.floor((Date.now() - startTime) / 1000) + 's'
        });

        // Check for completion
        if (order.status === OrderStatus.COMPLETED) {
            Logger.info('🎉 Swap completed successfully!', { orderId });

            // Show escrow details
            const sourceEscrow = relayer.getEscrow(`${orderId}_source`);
            const destEscrow = relayer.getEscrow(`${orderId}_destination`);

            Logger.info('Final escrow states', {
                source: sourceEscrow?.status,
                destination: destEscrow?.status
            });

            return;
        }

        // Check for errors
        if ([OrderStatus.CANCELLED, OrderStatus.EXPIRED].includes(order.status)) {
            Logger.warn('Swap failed or expired', {
                orderId,
                status: order.status
            });
            return;
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    Logger.warn('Monitoring timeout reached', { orderId });
}

// Demo function for reverse swap (EVM → TON)
async function runReverseSwap() {
    Logger.info('=== Reverse Swap Example (EVM → TON) ===');

    const relayer = new TonFusionRelayer(config);
    await relayer.start();

    const order = await relayer.createOrder({
        sourceChain: 'evm',
        destinationChain: 'ton',
        fromToken: '0xA0b86a33E6C100C10E8BD25E70e633c6E1976E08', // USDC
        toToken: 'TON',
        amount: '1000000', // 1 USDC (6 decimals)
        maker: '0x742d35Cc6634C0532925a3b8D80b1c0B16cC9002' // Example EVM address
    });

    Logger.info('Reverse order created', { orderId: order.orderId });
    await monitorOrder(relayer, order.orderId);
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'forward';

    switch (command) {
        case 'forward':
            await runSimpleSwap();
            break;
        case 'reverse':
            await runReverseSwap();
            break;
        default:
            console.log('Usage: npm run example [forward|reverse]');
            console.log('  forward: TON → EVM swap');
            console.log('  reverse: EVM → TON swap');
            process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Example failed:', error);
        process.exit(1);
    });
}