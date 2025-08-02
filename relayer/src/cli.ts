#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { TonRelayer } from './relayer';
import { config, validateConfig } from './config';
import { Logger } from './utils';

const program = new Command();

program
    .name('ton-relayer')
    .description('CLI relayer for 1inch Fusion+ TON cross-chain swaps')
    .version('1.0.0');

// Start relayer command
program
    .command('start')
    .description('Start the relayer service')
    .option('-w, --watch', 'Watch mode with live updates')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options) => {
        try {
            console.log(chalk.blue.bold('🚀 TON Fusion+ Relayer'));
            console.log(chalk.gray('Initializing...'));

            if (options.verbose) {
                process.env.LOG_LEVEL = 'debug';
            }

            validateConfig();

            const spinner = ora('Starting relayer...').start();
            const relayer = new TonRelayer(config);

            await relayer.start();
            spinner.succeed('Relayer started successfully');

            console.log(chalk.green('✅ Relayer is running'));
            console.log(chalk.yellow('Press Ctrl+C to stop'));

            if (options.watch) {
                relayer.enableWatchMode();
            }

            // Handle graceful shutdown
            process.on('SIGINT', async () => {
                console.log(chalk.yellow('\n🛑 Shutting down gracefully...'));
                await relayer.stop();
                process.exit(0);
            });

        } catch (error) {
            console.error(chalk.red('❌ Failed to start relayer:'), error.message);
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .description('Check relayer and contract status')
    .action(async () => {
        try {
            console.log(chalk.blue.bold('📊 Relayer Status'));

            const spinner = ora('Checking status...').start();
            const relayer = new TonRelayer(config);

            const status = await relayer.getStatus();
            spinner.stop();

            console.log(chalk.green('\n✅ System Status:'));
            console.log(`TON RPC: ${status.ton.connected ? chalk.green('Connected') : chalk.red('Disconnected')}`);
            console.log(`EVM RPC: ${status.evm.connected ? chalk.green('Connected') : chalk.red('Disconnected')}`);
            console.log(`Fusion API: ${status.fusion.connected ? chalk.green('Connected') : chalk.red('Disconnected')}`);

            console.log(chalk.blue('\n📋 Contract Status:'));
            console.log(`Source Escrow: ${status.contracts.sourceEscrow || 'Not deployed'}`);
            console.log(`Destination Escrow: ${status.contracts.destinationEscrow || 'Not deployed'}`);

            console.log(chalk.cyan('\n📈 Statistics:'));
            console.log(`Orders Processed: ${status.stats.ordersProcessed}`);
            console.log(`Active Orders: ${status.stats.activeOrders}`);
            console.log(`Uptime: ${status.stats.uptime}`);

        } catch (error) {
            console.error(chalk.red('❌ Failed to get status:'), error.message);
            process.exit(1);
        }
    });

// Monitor command
program
    .command('monitor')
    .description('Monitor orders and events in real-time')
    .option('-f, --filter <type>', 'Filter by order type (all|pending|active|completed)')
    .action(async (options) => {
        try {
            console.log(chalk.blue.bold('👀 Order Monitor'));

            const relayer = new TonRelayer(config);
            await relayer.startMonitoring({
                filter: options.filter || 'all',
                realTime: true
            });

        } catch (error) {
            console.error(chalk.red('❌ Failed to start monitoring:'), error.message);
            process.exit(1);
        }
    });

// Deploy contracts command
program
    .command('deploy')
    .description('Deploy TON escrow contracts')
    .option('--network <network>', 'Target network (testnet|mainnet)', 'testnet')
    .action(async (options) => {
        try {
            console.log(chalk.blue.bold('🚀 Contract Deployment'));

            const answers = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Deploy contracts to ${options.network}?`,
                    default: false
                }
            ]);

            if (!answers.confirm) {
                console.log(chalk.yellow('Deployment cancelled'));
                return;
            }

            const spinner = ora('Deploying contracts...').start();
            const relayer = new TonRelayer(config);

            const deployment = await relayer.deployContracts({
                network: options.network
            });

            spinner.succeed('Contracts deployed successfully');

            console.log(chalk.green('\n✅ Deployment Complete:'));
            console.log(`Source Escrow: ${deployment.sourceEscrow}`);
            console.log(`Destination Escrow: ${deployment.destinationEscrow}`);
            console.log(`Transaction: ${deployment.txHash}`);

        } catch (error) {
            console.error(chalk.red('❌ Deployment failed:'), error.message);
            process.exit(1);
        }
    });

// Config command
program
    .command('config')
    .description('Manage relayer configuration')
    .option('--show', 'Show current configuration')
    .option('--validate', 'Validate configuration')
    .action(async (options) => {
        try {
            if (options.show) {
                console.log(chalk.blue.bold('⚙️  Current Configuration:'));
                console.log(chalk.gray(JSON.stringify({
                    ton: {
                        rpcUrl: config.ton.rpcUrl,
                        sourceEscrow: config.ton.sourceEscrow,
                        destinationEscrow: config.ton.destinationEscrow
                    },
                    evm: {
                        rpcUrl: config.evm.rpcUrl,
                        chainId: config.evm.chainId,
                        resolverContract: config.evm.resolverContract
                    },
                    fusion: {
                        apiUrl: config.fusion.apiUrl
                    }
                }, null, 2)));
            }

            if (options.validate) {
                console.log(chalk.blue.bold('✅ Validating Configuration...'));
                validateConfig();
                console.log(chalk.green('Configuration is valid'));
            }

        } catch (error) {
            console.error(chalk.red('❌ Configuration error:'), error.message);
            process.exit(1);
        }
    });

// Orders command  
program
    .command('orders')
    .description('Manage and view orders')
    .option('-l, --list', 'List all orders')
    .option('-s, --status <orderId>', 'Get order status')
    .option('--cleanup', 'Clean up completed orders')
    .action(async (options) => {
        try {
            const relayer = new TonRelayer(config);

            if (options.list) {
                console.log(chalk.blue.bold('📋 Active Orders'));
                const orders = await relayer.getOrders();

                if (orders.length === 0) {
                    console.log(chalk.gray('No active orders'));
                    return;
                }

                orders.forEach(order => {
                    const statusColor = order.status === 'completed' ? chalk.green :
                        order.status === 'failed' ? chalk.red : chalk.yellow;
                    console.log(`${statusColor(order.orderId)} - ${order.sourceChain} → ${order.destinationChain} - ${statusColor(order.status)}`);
                });
            }

            if (options.status) {
                console.log(chalk.blue.bold(`📄 Order Status: ${options.status}`));
                const order = await relayer.getOrderDetails(options.status);
                console.log(JSON.stringify(order, null, 2));
            }

            if (options.cleanup) {
                const spinner = ora('Cleaning up completed orders...').start();
                const cleaned = await relayer.cleanupOrders();
                spinner.succeed(`Cleaned up ${cleaned} orders`);
            }

        } catch (error) {
            console.error(chalk.red('❌ Orders command failed:'), error.message);
            process.exit(1);
        }
    });

// Test command
program
    .command('test')
    .description('Test relayer functionality')
    .option('--contracts', 'Test contract connections')
    .option('--orders', 'Test order processing')
    .action(async (options) => {
        try {
            console.log(chalk.blue.bold('🧪 Running Tests'));

            const relayer = new TonRelayer(config);
            const results = await relayer.runTests({
                contracts: options.contracts,
                orders: options.orders
            });

            console.log(chalk.green('\n✅ Test Results:'));
            Object.entries(results).forEach(([test, passed]) => {
                const icon = passed ? '✅' : '❌';
                const color = passed ? chalk.green : chalk.red;
                console.log(`${icon} ${color(test)}`);
            });

        } catch (error) {
            console.error(chalk.red('❌ Tests failed:'), error.message);
            process.exit(1);
        }
    });

export { program };