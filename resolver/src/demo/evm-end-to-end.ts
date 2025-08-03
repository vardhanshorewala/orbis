import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Wallet, JsonRpcProvider, parseEther, formatEther, keccak256, getAddress, toBeHex, zeroPadValue, HDNodeWallet, AbiCoder } from 'ethers';
import { EvmAdapter, EscrowImmutables, CrossChainSwapConfig } from '../adapters/EvmAdapter';
import { ResolverAdapter, ResolverConfig } from '../adapters/ResolverAdapter';
import { Logger } from '../utils';
import { loadConfig } from '../config';
import chalk from 'chalk';

/**
 * End-to-end demonstration of EVM cross-chain swaps using the actual escrow contracts
 */

// Convert address to uint256 for the escrow immutables
function addressToUint256(address: string): bigint {
    return BigInt(address);
}

// Helper to generate a demo order
function createDemoOrder(maker: string, taker: string) {
    const secret = '0x' + randomBytes(32).toString('hex');
    const secretHash = keccak256(secret);
    const orderId = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const orderHash = keccak256(Buffer.from(orderId));

    return {
        orderId,
        orderHash,
        secret,
        secretHash,
        maker,
        taker,
        amount: parseEther('0.0001'), // 0.01 ETH
        safetyDeposit: parseEther('0.00001'), // 0.001 ETH safety deposit
        timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
}

export async function main() {
    try {
        Logger.info('🚀 Starting EVM escrow end-to-end demo');

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

        Logger.info(`📍 Wallet address: ${makerAddress}`);
        Logger.info(`⛓️  Chain ID: ${chainId}`);

        // Check balance
        const balance = await provider.getBalance(makerAddress);
        Logger.info(`💰 Wallet balance: ${formatEther(balance)} ETH`);

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
        const order = createDemoOrder(makerAddress, takerAddress);

        Logger.info(chalk.blue('\n📋 Created demo order:'));
        Logger.info(`   Order ID: ${order.orderId}`);
        Logger.info(`   Order Hash: ${order.orderHash}`);
        Logger.info(`   Secret Hash: ${order.secretHash}`);
        Logger.info(`   Amount: ${formatEther(order.amount)} ETH`);

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

        // const srcImmutables: EscrowImmutables = {
        //     orderHash: order.orderHash,
        //     hashlock: order.secretHash,
        //     maker: addressToUint256(makerAddress),
        //     taker: addressToUint256(takerAddress),
        //     token: 0n, // Native ETH
        //     amount: order.amount,
        //     safetyDeposit: order.safetyDeposit,
        //     timelocks: BigInt(order.timelock),
        //     parameters: parameters,
        // };

        // Logger.info('📍 Getting source escrow address...');
        // const srcEscrowAddress = await adapter.getSourceEscrowAddress(srcImmutables);
        // Logger.info(`✅ Source escrow address: ${srcEscrowAddress}`);

        // // Step 2: Maker sends funds to source escrow
        // Logger.info('\n💸 Maker sending funds to source escrow...');
        // const srcFundTx = await wallet.sendTransaction({
        //     to: srcEscrowAddress,
        //     value: order.amount + order.safetyDeposit,
        // });
        // await srcFundTx.wait();
        // Logger.info(`✅ Funds sent! TX: ${srcFundTx.hash}`);

        // // Check escrow balance
        // const escrowBalance = await provider.getBalance(srcEscrowAddress);
        // Logger.info(`📊 Escrow balance: ${formatEther(escrowBalance)} ETH`);

        // // Step 3: Taker withdraws using secret
        // Logger.info('\n🔓 Taker withdrawing from source escrow with secret...');
        // const withdrawResult = await adapter.withdrawFromSourceEscrow(
        //     wallet,
        //     srcEscrowAddress,
        //     order.secret,
        //     srcImmutables
        // );
        // Logger.info(`✅ Withdrawn! TX: ${withdrawResult.transactionHash}`);


        // // ----------------------------------------------------------------------------
        // // SCENARIO 3: Cancellation Flow
        // // ----------------------------------------------------------------------------
        // Logger.info(chalk.yellow('\n=== SCENARIO 3: Cancellation Flow (Demo) ===\n'));

        // // Create a new order that we'll cancel
        // const cancelOrder = createDemoOrder(makerAddress, takerAddress);
        // const cancelImmutables: EscrowImmutables = {
        //     orderHash: cancelOrder.orderHash,
        //     hashlock: cancelOrder.secretHash,
        //     maker: addressToUint256(makerAddress),
        //     taker: addressToUint256(takerAddress),
        //     token: 0n,
        //     amount: parseEther('0.005'),
        //     safetyDeposit: parseEther('0.0005'),
        //     timelocks: BigInt(Math.floor(Date.now() / 1000) + 60), // 1 minute (short for demo)
        // };

        // Logger.info('📍 Getting source escrow address for cancellation demo...');
        // const cancelSrcAddress = await adapter.getSourceEscrowAddress(cancelImmutables);
        // Logger.info(`✅ Source escrow address: ${cancelSrcAddress}`);

        // // Fund it
        // Logger.info('💸 Funding escrow...');
        // const cancelFundTx = await wallet.sendTransaction({
        //     to: cancelSrcAddress,
        //     value: cancelImmutables.amount + cancelImmutables.safetyDeposit,
        // });
        // await cancelFundTx.wait();
        // Logger.info(`✅ Funded! TX: ${cancelFundTx.hash}`);

        // Logger.info('\n⏳ Waiting for timelock to expire (65 seconds)...');
        // await new Promise(resolve => setTimeout(resolve, 65000));

        // Logger.info('🚫 Cancelling source escrow...');
        // const cancelResult = await adapter.cancelSourceEscrow(
        //     wallet,
        //     cancelSrcAddress,
        //     cancelImmutables
        // );
        // Logger.info(`✅ Cancelled! TX: ${cancelResult.transactionHash}`);

        // ----------------------------------------------------------------------------
        // SCENARIO 4: Using Resolver Contract
        // ----------------------------------------------------------------------------
        const resolverAddress = process.env.RESOLVER_ADDRESS;
        const lopAddress = process.env.LOP_ADDRESS || '0x0000000000000000000000000000000000000000'; // Placeholder
        Logger.info(`📝 RESOLVER_ADDRESS from env: ${resolverAddress}`);
        if (resolverAddress) {
            Logger.info(chalk.yellow('\n=== SCENARIO 4: Destination Escrow via Resolver Contract ===\n'));
            Logger.info(`📍 Using Resolver at: ${resolverAddress}`);
            Logger.info(`🔑 Calling from wallet: ${wallet.address}`);

            // Create ResolverAdapter
            const resolverConfig: ResolverConfig = {
                resolverAddress,
                escrowFactoryAddress: config.evm.escrowFactory || '0x5E6c65b99cC2Cc6eFD3Fc0D39336dA2491404008',
                lopAddress,
            };

            const resolverAdapter = new ResolverAdapter(provider, resolverConfig);

            // Create a new order for resolver demo
            const resolverOrder = createDemoOrder(makerAddress, takerAddress);

            // Create immutables with resolver as taker
            const resolverImmutables = {
                orderHash: resolverOrder.orderHash,
                hashlock: resolverOrder.secretHash,
                maker: addressToUint256(makerAddress),
                taker: addressToUint256(resolverAddress), // Resolver is the taker!
                token: 0n,
                amount: parseEther('0.0001'),
                safetyDeposit: parseEther('0.00001'),
                timelocks: BigInt(resolverOrder.timelock),
                parameters: parameters, // Use the same encoded parameters
            };

            try {
                // Step 1: Deploy destination escrow through resolver
                Logger.info('🏗️  Deploying destination escrow through resolver...');

                // Debug: Log the value being sent
                const isNativeToken = resolverImmutables.token === 0n;
                const nativeAmount = isNativeToken
                    ? resolverImmutables.safetyDeposit + resolverImmutables.amount
                    : resolverImmutables.safetyDeposit;
                Logger.info(`💸 Sending ${formatEther(nativeAmount)} ETH with deployment`);

                const dstResolverResult = await resolverAdapter.deployDstEscrow(
                    wallet,
                    resolverImmutables,
                    BigInt(resolverOrder.timelock + 1800)
                );
                Logger.info(`✅ Deployed via resolver! TX: ${dstResolverResult.transactionHash}`);
                Logger.info(`   Block timestamp: ${dstResolverResult.blockTimestamp}`);

                // Step 2: Get the escrow address from the transaction receipt
                // When using Resolver, we need to look for the event from the Factory
                const dstResolverReceipt = await provider.getTransactionReceipt(dstResolverResult.transactionHash);
                if (!dstResolverReceipt) {
                    throw new Error('Transaction receipt not found');
                }

                // Debug: Check all logs in the transaction
                Logger.info(`📝 Transaction logs: ${dstResolverReceipt.logs.length} logs found`);

                // Look for DstEscrowCreated event from the factory
                // The factory address is in our config
                const factoryAddress = config.evm.escrowFactory || '0x5E6c65b99cC2Cc6eFD3Fc0D39336dA2491404008';
                let escrowAddressFromEvent: string | null = null;

                for (const log of dstResolverReceipt.logs) {
                    if (log.address.toLowerCase() === factoryAddress.toLowerCase()) {
                        Logger.info(`📍 Found log from factory at index ${log.index}`);
                        // Try to parse as DstEscrowCreated event
                        try {
                            const parsed = adapter.factoryInterface.parseLog({
                                topics: log.topics,
                                data: log.data
                            });
                            if (parsed && parsed.name === 'DstEscrowCreated') {
                                escrowAddressFromEvent = parsed.args.escrow;
                                Logger.info(`✅ Found DstEscrowCreated event, escrow: ${escrowAddressFromEvent}`);
                                break;
                            }
                        } catch (e) {
                            // Not the event we're looking for
                        }
                    }
                }

                // Also calculate what it should be
                const calculatedAddress = await adapter.getDestinationEscrowAddress(resolverImmutables);
                Logger.info(`📍 Calculated destination escrow: ${calculatedAddress}`);

                // Use the event address if available, otherwise calculated
                const dstResolverAddress = escrowAddressFromEvent || calculatedAddress;

                // Check balance
                const resolverEscrowBalance = await provider.getBalance(dstResolverAddress);
                Logger.info(`💰 Escrow balance: ${formatEther(resolverEscrowBalance)} ETH`);

                // Verify the escrow exists
                const escrowCode = await provider.getCode(dstResolverAddress);
                if (escrowCode === '0x') {
                    Logger.error('❌ No contract found at the escrow address!');
                    Logger.info('📝 This might be due to timestamp differences in address calculation.');

                    // Let's check if the escrow was created at a different address
                    // by adjusting the timelocks with the block timestamp
                    const adjustedImmutables = {
                        ...resolverImmutables,
                        timelocks: resolverImmutables.timelocks + BigInt(dstResolverResult.blockTimestamp)
                    };
                    const adjustedAddress = await adapter.getDestinationEscrowAddress(adjustedImmutables);
                    Logger.info(`📍 Address with adjusted timelocks: ${adjustedAddress}`);
                    const adjustedCode = await provider.getCode(adjustedAddress);
                    if (adjustedCode !== '0x') {
                        Logger.info('✅ Found contract at adjusted address!');
                    }
                }

                // 
                // Step 3: Withdraw through resolver
                Logger.info('\n🔓 Withdrawing through resolver...');

                // Adjust immutables with deployment timestamp
                const adjustedImmutables = {
                    ...resolverImmutables,
                    timelocks: resolverImmutables.timelocks, // The resolver will handle timestamp adjustment
                };
                // Add a 30 second delay
                await new Promise(resolve => setTimeout(resolve, 30000));
                const withdrawResolverResult = await resolverAdapter.withdraw(
                    wallet,
                    dstResolverAddress,
                    resolverOrder.secret,
                    adjustedImmutables
                );
                Logger.info(`✅ Withdrawn via resolver! TX: ${withdrawResolverResult.transactionHash}`);

            } catch (error: any) {
                Logger.error(`❌ Resolver demo failed: ${error.message}`);
                Logger.info('\n📝 Note: Make sure you have deployed a Resolver contract and set RESOLVER_ADDRESS in .env');
            }
        } else {
            Logger.info(chalk.dim('\n📝 Skipping Resolver demo (set RESOLVER_ADDRESS in .env to enable)'));
        }

        Logger.info(chalk.green('\n✨ EVM escrow end-to-end demo completed successfully!'));

    } catch (error) {
        Logger.error(`❌ Demo failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}