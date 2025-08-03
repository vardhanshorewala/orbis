#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TonResolver } from './resolver';
import { loadConfig, validateConfig, getSampleEnv } from './config';
import { Logger } from './utils';
import { CrossChainSwapOrder } from './types';

const program = new Command();

program
    .name('ton-resolver')
    .description('Simple resolver for 1inch Fusion+ TON cross-chain swaps')
    .version('1.0.0');

// Server command
program
    .command('server')
    .description('Start the resolver HTTP server')
    .option('-p, --port <port>', 'Port to run the server on', '8080')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🚀 Starting Orbis Resolver Server'));

            const { main: startServer } = await import('./index');
            process.env.PORT = options.port;
            await startServer();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Failed to start server:'), errorMessage);
            process.exit(1);
        }
    });

// Start command
program
    .command('start')
    .description('Start the resolver service')
    .option('--test', 'Run in test mode with mock orders')
    .action(async (options) => {
        try {
            console.log(chalk.blue('🚀 TON Fusion+ Resolver'));

            const config = loadConfig();
            validateConfig(config);

            const resolver = new TonResolver(config);

            if (options.test) {
                console.log(chalk.yellow('🧪 Running in test mode'));
                await runTestMode(resolver);
            } else {
                console.log(chalk.green('✅ Resolver is starting'));
                console.log('Press Ctrl+C to stop');

                // Handle graceful shutdown
                process.on('SIGINT', async () => {
                    console.log(chalk.yellow('\n🛑 Shutting down resolver...'));
                    await resolver.stop();
                    process.exit(0);
                });

                await resolver.start();
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Failed to start resolver:'), errorMessage);
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .description('Check resolver status')
    .action(async () => {
        try {
            const spinner = ora('Checking resolver status...').start();

            const config = loadConfig();
            const resolver = new TonResolver(config);
            const status = await resolver.getStatus();

            spinner.stop();

            console.log(chalk.blue('📊 Resolver Status'));
            console.log(`Running: ${status.running ? chalk.green('Yes') : chalk.red('No')}`);
            console.log(`Active Orders: ${chalk.yellow(status.activeOrders)}`);
            console.log(`TON Address: ${chalk.cyan(status.config.tonAddress)}`);
            console.log(`EVM Address: ${chalk.cyan(status.config.evmAddress)}`);
            console.log(`Min Profit: ${chalk.yellow(status.config.minProfitThreshold)}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Failed to get status:'), errorMessage);
            process.exit(1);
        }
    });

// Process order command
program
    .command('process-order')
    .description('Process a single order (for testing)')
    .option('--order-id <id>', 'Order ID')
    .option('--maker <address>', 'Maker address')
    .option('--source-chain <chain>', 'Source chain (ton/evm)')
    .option('--dest-chain <chain>', 'Destination chain (ton/evm)')
    .option('--from-token <address>', 'From token address')
    .option('--to-token <address>', 'To token address')
    .option('--amount <amount>', 'Amount to swap')
    .action(async (options) => {
        try {
            if (!options.orderId || !options.maker || !options.sourceChain ||
                !options.destChain || !options.fromToken || !options.toToken || !options.amount) {
                console.error(chalk.red('❌ Missing required options'));
                console.log('Example: ton-resolver process-order --order-id test123 --maker 0x123... --source-chain ton --dest-chain evm --from-token TON --to-token USDC --amount 1000000000');
                process.exit(1);
            }

            const config = loadConfig();
            const resolver = new TonResolver(config);

            const order: CrossChainSwapOrder = {
                orderId: options.orderId,
                maker: options.maker,
                sourceChain: options.sourceChain as 'ton' | 'evm',
                destinationChain: options.destChain as 'ton' | 'evm',
                fromToken: options.fromToken,
                toToken: options.toToken,
                amount: options.amount,
                minReceiveAmount: (BigInt(options.amount) * 95n / 100n).toString(), // 5% slippage
                secretHash: '', // Will be generated
                timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour
                makerAddress: options.maker,
                resolverFee: '10000', // 0.01 USDC
                deadline: Math.floor(Date.now() / 1000) + 7200 // 2 hours
            };

            const spinner = ora('Processing order...').start();

            const success = await resolver.processOrder(order);

            spinner.stop();

            if (success) {
                console.log(chalk.green('✅ Order processed successfully'));
            } else {
                console.log(chalk.red('❌ Order processing failed'));
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Failed to process order:'), errorMessage);
            process.exit(1);
        }
    });

// Config command
program
    .command('config')
    .description('Manage resolver configuration')
    .option('--show', 'Show current configuration')
    .option('--validate', 'Validate configuration')
    .option('--sample', 'Show sample .env file')
    .action(async (options) => {
        try {
            if (options.sample) {
                console.log(chalk.blue('📝 Sample .env file:'));
                console.log(getSampleEnv());
                return;
            }

            const config = loadConfig();

            if (options.validate) {
                const spinner = ora('Validating configuration...').start();
                validateConfig(config);
                spinner.succeed('Configuration is valid');
                return;
            }

            if (options.show) {
                console.log(chalk.blue('⚙️ Current Configuration:'));
                console.log(JSON.stringify(config, null, 2));
                return;
            }

            // Default: show basic info
            console.log(chalk.blue('⚙️ Resolver Configuration'));
            console.log(`TON RPC: ${config.ton.rpcUrl}`);
            console.log(`EVM RPC: ${config.evm.rpcUrl}`);
            console.log(`EVM Chain ID: ${config.evm.chainId}`);
            console.log(`Min Profit: ${config.resolver.minProfitThreshold}`);
            console.log(`Timeout: ${config.resolver.timeoutSeconds}s`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Configuration error:'), errorMessage);
            process.exit(1);
        }
    });

// Demo command
program
    .command('demo')
    .description('Run a demo swap')
    .option('-t, --type <type>', 'Demo type: simple, evm, e2e, evm-e2e, same-chain, factory, or cross-chain', 'simple')
    .action(async (options) => {
        try {
            switch (options.type) {
                case 'evm':
                    console.log(chalk.blue('🚀 Running EVM escrow demo...'));
                    const { runEvmDemo } = await import('./demo/evm-demo');
                    await runEvmDemo();
                    break;

                case 'e2e':
                    console.log(chalk.blue('🚀 Running end-to-end demo...'));
                    const { main: runE2E } = await import('./demo/end-to-end');
                    await runE2E();
                    break;

                case 'evm-e2e':
                    console.log(chalk.blue('🚀 Running EVM end-to-end demo...'));
                    const { main: runEvmE2E } = await import('./demo/evm-end-to-end');
                    await runEvmE2E();
                    break;

                case 'same-chain':
                    console.log(chalk.blue('🔄 Running same-chain swap demo...'));
                    const { main: runSameChain } = await import('./demo/same-chain-swap');
                    await runSameChain();
                    break;

                case 'factory':
                    console.log(chalk.blue('🏭 Running factory demo...'));
                    const { main: runFactory } = await import('./demo/simple-factory-demo');
                    await runFactory();
                    break;

                case '1inch':
                case 'cross-chain':
                    console.log(chalk.blue('🚀 Running cross-chain demo...'));
                    const { runCrossChainDemo } = await import('./demo/cross-chain-demo');
                    await runCrossChainDemo();
                    break;

                case 'simple':
                default:
                    const spinner = ora('Running simple demo swap...').start();

                    const config = loadConfig();
                    const resolver = new TonResolver(config);

                    // Create a demo order for EVM to EVM swap
                    const demoOrder: CrossChainSwapOrder = {
                        orderId: `demo_${Date.now()}`,
                        maker: '0x1234567890123456789012345678901234567890', // Example EVM address
                        sourceChain: 'evm',
                        destinationChain: 'evm',
                        fromToken: 'USDC',
                        toToken: 'USDT',
                        amount: '100',
                        minReceiveAmount: '95',
                        secretHash: '0x' + require('crypto').randomBytes(32).toString('hex'),
                        timelock: Math.floor(Date.now() / 1000) + 3600,
                        makerAddress: '0x1234567890123456789012345678901234567890',
                        resolverFee: '1000000',
                        deadline: Math.floor(Date.now() / 1000) + 7200
                    };

                    spinner.text = 'Processing demo order...';

                    const success = await resolver.processOrder(demoOrder);

                    spinner.stop();

                    if (success) {
                        console.log(chalk.green('✅ Demo swap completed successfully!'));
                    } else {
                        console.log(chalk.red('❌ Demo swap failed'));
                    }
                    break;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Demo failed:'), errorMessage);
            process.exit(1);
        }
    });

// Handle order from relayer
program
    .command('handle-order <orderJson>')
    .description('Process an order from the relayer (JSON string)')
    .action(async (orderJson: string) => {
        try {
            const order: CrossChainSwapOrder = JSON.parse(orderJson);
            console.log(chalk.blue('📥 Received order from relayer'), `Order ID: ${order.orderId}`);

            const config = loadConfig();
            const resolver = new TonResolver(config);

            const success = await resolver.processOrder(order);

            if (success) {
                console.log(chalk.green('✅ Order processed successfully'));
                process.exit(0);
            } else {
                console.log(chalk.red('❌ Order processing failed'));
                process.exit(1);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('❌ Failed to process order:'), errorMessage);
            process.exit(1);
        }
    });

// Test mode function
async function runTestMode(resolver: TonResolver): Promise<void> {
    console.log(chalk.yellow('🧪 Running test order...'));

    const testOrder: CrossChainSwapOrder = {
        orderId: `test_${Date.now()}`,
        maker: '0x742d35Cc6635C0532925a3b8D3AC8B5eD5b1d3e5',
        sourceChain: 'ton',
        destinationChain: 'evm',
        fromToken: 'TON',
        toToken: 'USDC',
        amount: '1000000000', // 1 TON
        minReceiveAmount: '950000000', // 0.95 TON equivalent
        secretHash: '',
        timelock: Math.floor(Date.now() / 1000) + 3600,
        makerAddress: '0x742d35Cc6635C0532925a3b8D3AC8B5eD5b1d3e5',
        resolverFee: '10000',
        deadline: Math.floor(Date.now() / 1000) + 7200
    };

    const success = await resolver.processOrder(testOrder);

    if (success) {
        console.log(chalk.green('✅ Test order completed successfully'));
    } else {
        console.log(chalk.red('❌ Test order failed'));
    }
}

export { program };