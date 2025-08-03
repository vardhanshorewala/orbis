import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Wallet, JsonRpcProvider, parseEther, formatEther, keccak256, getAddress, toBeHex, zeroPadValue, HDNodeWallet, AbiCoder } from 'ethers';
import { EvmAdapter, EscrowImmutables, CrossChainSwapConfig } from '../adapters/EvmAdapter';
import { ResolverAdapter, ResolverConfig } from '../adapters/ResolverAdapter';
import { Logger } from '../utils';
import { loadConfig } from '../config';
import chalk from 'chalk';

// Convert address to uint256 representation
function addressToUint256(address: string): bigint {
    return BigInt(address);
}

// Helper to create a demo order
function createDemoOrder(maker: string, taker: string) {
    const secret = '0x' + randomBytes(32).toString('hex');
    const secretHash = keccak256(secret);
    const orderId = `same_chain_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const orderHash = keccak256(Buffer.from(orderId));

    return {
        orderId,
        orderHash,
        secret,
        secretHash,
        maker,
        taker,
        amount: parseEther('0.00001'), // 0.0001 ETH
        safetyDeposit: parseEther('0.00001'), // 0.00001 ETH safety deposit
        timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
}

export async function main() {
    try {
        Logger.info(chalk.cyan('🔄 Starting Same-Chain Swap Demo'));
        Logger.info('This simulates a cross-chain swap where both escrows are on the same chain\n');

        // Load configuration
        const config = loadConfig();
        const provider = new JsonRpcProvider(config.evm.rpcUrl);

        // Setup wallets
        let makerWallet: Wallet;
        let takerWallet: Wallet;

        if (config.evm.mnemonic) {
            const hdWallet = HDNodeWallet.fromPhrase(config.evm.mnemonic);
            makerWallet = new Wallet(hdWallet.privateKey, provider);
            // Derive a second wallet for the taker (relative path)
            const hdWallet2 = hdWallet.derivePath("1");
            takerWallet = new Wallet(hdWallet2.privateKey, provider);
        } else {
            throw new Error('EVM_MNEMONIC not configured');
        }

        const makerAddress = await makerWallet.getAddress();
        const takerAddress = await makerWallet.getAddress();

        Logger.info(`👤 Maker wallet: ${makerAddress}`);
        Logger.info(`👤 Taker wallet: ${takerAddress}`);
        Logger.info(`⛓️  Chain ID: ${config.evm.chainId}`);

        // Check balances
        const makerBalance = await provider.getBalance(makerAddress);
        const takerBalance = await provider.getBalance(takerAddress);
        Logger.info(`💰 Maker balance: ${formatEther(makerBalance)} ETH`);
        Logger.info(`💰 Taker balance: ${formatEther(takerBalance)} ETH`);

        // if (makerBalance < parseEther('0.001')) {
        //     throw new Error('Maker needs at least 0.001 ETH for demo');
        // }

        // Fund taker wallet if needed
        // if (takerBalance < parseEther('0.0002')) {
        //     Logger.info('\n💸 Funding taker wallet from maker...');
        //     const fundTx = await makerWallet.sendTransaction({
        //         to: takerAddress,
        //         value: parseEther('0.0003'), // Send enough for gas and escrow
        //     });
        //     await fundTx.wait();
        //     Logger.info(`✅ Sent 0.0003 ETH to taker! TX: ${fundTx.hash}`);
        // }

        // Initialize adapter
        const swapConfig: CrossChainSwapConfig = {
            escrowFactoryAddress: config.evm.escrowFactory,
            sourceChainId: config.evm.chainId,
            destinationChainId: config.evm.chainId, // Same chain!
        };
        const adapter = new EvmAdapter(provider, swapConfig);

        // Create order
        const order = createDemoOrder(makerAddress, takerAddress);
        Logger.info('\n📋 Created swap order:');
        Logger.info(`   Order Hash: ${order.orderHash}`);
        Logger.info(`   Secret Hash: ${order.secretHash}`);
        Logger.info(`   Amount: ${formatEther(order.amount)} ETH`);
        Logger.info(`   Safety Deposit: ${formatEther(order.safetyDeposit)} ETH`);

        // Encode parameters for immutables
        const abiCoder = new AbiCoder();
        const parameters = abiCoder.encode(
            ['uint256', 'uint256', 'uint256', 'uint256'],
            [0n, 0n, addressToUint256('0x0000000000000000000000000000000000000000'), addressToUint256('0x0000000000000000000000000000000000000000')]
        );

        const srcImmutables: EscrowImmutables = {
            orderHash: order.orderHash,
            hashlock: order.secretHash,
            maker: addressToUint256(makerAddress),
            taker: addressToUint256(takerAddress),
            token: 0n, // Native ETH
            amount: order.amount,
            safetyDeposit: order.safetyDeposit,
            timelocks: BigInt(order.timelock),
            parameters: parameters,
        };

        // For same-chain swap, we'll use the same immutables but swap maker/taker roles
        // IMPORTANT: In destination escrow, the withdraw() function has onlyTaker modifier
        // So the taker must be the one calling withdraw, even though funds go to maker
        const dstImmutables: EscrowImmutables = {
            orderHash: order.orderHash,
            hashlock: order.secretHash,
            maker: addressToUint256(takerAddress), // Who receives the funds
            taker: addressToUint256(makerAddress), // Who can call withdraw (onlyTaker)
            token: 0n, // Native ETH
            amount: order.amount,
            safetyDeposit: order.safetyDeposit,
            timelocks: BigInt(order.timelock + 1800), // 30 minutes after src
            parameters: parameters,
        };

        // Setup Resolver
        Logger.info(chalk.yellow('\n=== Using Resolver Contract ==='));

        // Use hardcoded resolver addresses for demo
        const resolverAddress = '0xF0aDD69d7D97eAb47F4D2297ad81Cf091AEad08f';
        const lopAddress = '0xd2d35b2bF690992c07BE6dF175B050054dA643A8';

        Logger.info(`📍 Resolver at: ${resolverAddress}`);
        Logger.info(`📍 LOP at: ${lopAddress}`);

        const resolverConfig: ResolverConfig = {
            resolverAddress,
            escrowFactoryAddress: config.evm.escrowFactory,
            lopAddress,
        };
        const resolverAdapter = new ResolverAdapter(provider, resolverConfig);

        // For demo purposes, we'll use the maker wallet as the "resolver owner"
        // In production, this would be a separate wallet that owns the Resolver contract
        Logger.info(chalk.yellow('\n⚠️  Note: For this demo, we\'ll simulate Resolver operations'));
        Logger.info(chalk.yellow('In production, only the Resolver owner can call these methods\n'));



        // STEP 1: Deploy DESTINATION escrow through Resolver
        Logger.info('\n📦 Step 1: Deploy DESTINATION escrow through Resolver');
        Logger.info('The Resolver will deploy the destination escrow');

        // Note: deployDstEscrow expects srcCancellationTimestamp
        const srcCancellationTimestamp = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2 hours

        const dstResult = await resolverAdapter.deployDstEscrow(
            makerWallet, // Simulate resolver owner
            dstImmutables,
            srcCancellationTimestamp
        );
        Logger.info(`✅ Destination escrow deployed! TX: ${dstResult.transactionHash}`);

        // Get destination escrow address
        const dstReceipt = await provider.getTransactionReceipt(dstResult.transactionHash);
        if (!dstReceipt) throw new Error('Transaction receipt not found');

        // Parse the logs to find the escrow address
        let dstEscrowAddress: string | null = null;
        for (const log of dstReceipt.logs) {
            try {
                const parsed = adapter.factoryInterface.parseLog({
                    topics: log.topics as string[],
                    data: log.data
                });
                if (parsed && parsed.name === 'DstEscrowCreated') {
                    dstEscrowAddress = parsed.args[0]; // escrow address is first arg
                    break;
                }
            } catch (e) {
                // Not a factory event, continue
            }
        }
        Logger.info(`📍 Destination escrow at: ${dstEscrowAddress || 'not found in events'}`);

        // Check balances
        const dstBalance = await provider.getBalance(dstEscrowAddress || '0x');
        Logger.info(`💰 Destination escrow balance: ${formatEther(dstBalance)} ETH`);

        // STEP 2: Deploy SOURCE escrow through Resolver
        Logger.info('\n📦 Step 2: Deploy SOURCE escrow through Resolver');
        Logger.info('In production, the LOP would call fillOrder which triggers deploySrc');

        // For deploySrc, we need to create a mock order and signature
        const mockOrder = {
            salt: BigInt(Date.now()),
            maker: addressToUint256(makerAddress),
            receiver: addressToUint256(takerAddress),
            makerAsset: addressToUint256("0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"), // ETH
            takerAsset: addressToUint256("0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"), // ETH
            makingAmount: order.amount,
            takingAmount: order.amount,
            makerTraits: 0n,
        };

        const mockSignature = {
            r: '0x' + '0'.repeat(64),
            vs: '0x' + '0'.repeat(64),
        };

        // Note: In production, this would be done by LOP calling fillOrder
        // For demo, we'll simulate by funding the predicted source escrow address
        const srcEscrowAddress = await adapter.getSourceEscrowAddress(srcImmutables);
        Logger.info(`📍 Source escrow will be at: ${srcEscrowAddress}`);

        Logger.info('\n💰 Funding source escrow (simulating deploySrc)');
        const fundTx = await makerWallet.sendTransaction({
            to: srcEscrowAddress,
            value: order.amount + order.safetyDeposit
        });
        await fundTx.wait();
        Logger.info(`✅ Funded source escrow with ${formatEther(order.amount + order.safetyDeposit)} ETH`);

        // STEP 3: Resolver withdraws from SOURCE escrow (reveals secret)
        Logger.info('\n🔓 Step 3: Resolver withdraws from SOURCE escrow');
        Logger.info('This reveals the secret on-chain');

        const srcWithdrawResult = await resolverAdapter.withdraw(
            makerWallet, // Simulate resolver owner
            srcEscrowAddress,
            order.secret,
            srcImmutables
        );
        Logger.info(`✅ Withdrawn from source! TX: ${srcWithdrawResult.transactionHash}`);
        Logger.info('🎉 Secret revealed on-chain!');

        // STEP 4: Withdraw from DESTINATION escrow
        Logger.info('\n💰 Step 4: Withdraw from DESTINATION escrow');
        Logger.info('Since the secret is now revealed, funds can be withdrawn from destination');

        if (dstEscrowAddress) {
            try {
                // For destination, the maker receives funds but taker must call withdraw
                // Since we set taker=makerAddress in dstImmutables, makerWallet can withdraw
                const dstWithdrawResult = await resolverAdapter.withdraw(
                    makerWallet, // Must be the taker as per dstImmutables
                    dstEscrowAddress,
                    order.secret,
                    dstImmutables
                );
                Logger.info(`✅ Withdrawn from destination! TX: ${dstWithdrawResult.transactionHash}`);
            } catch (error: any) {
                Logger.error(`❌ Withdrawal failed: ${error.message}`);
                Logger.info(`📝 Error data: ${error.data}`);
                if (error.data === '0x6f7eac26') {
                    Logger.info('📝 This is the InvalidImmutables error');
                } else if (error.data === '0x48f5c3ed') {
                    Logger.info('📝 This might be the onlyTaker modifier - wrong wallet trying to withdraw');
                }
            }
        }
    } catch (error) {
        Logger.error(`❌ Demo failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}


// Run if called directly
if (require.main === module) {
    main();
}