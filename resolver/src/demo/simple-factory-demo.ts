import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Wallet, JsonRpcProvider, parseEther, formatEther, keccak256, HDNodeWallet, AbiCoder } from 'ethers';
import { EvmAdapter, EscrowImmutables, CrossChainSwapConfig } from '../adapters/EvmAdapter';
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
    const orderId = `factory_demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const orderHash = keccak256(Buffer.from(orderId));

    return {
        orderId,
        orderHash,
        secret,
        secretHash,
        maker,
        taker,
        amount: parseEther('0.00001'), // 0.00001 ETH
        safetyDeposit: parseEther('0.00001'), // 0.00001 ETH safety deposit
        timelock: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
}

async function main() {
    try {
        Logger.info(chalk.cyan('🔄 Simple Factory Demo'));
        Logger.info('This demonstrates destination escrow deployment and withdrawal directly via factory\n');

        const config = loadConfig();
        const provider = new JsonRpcProvider(config.evm.rpcUrl);

        // Setup wallets
        let makerWallet: Wallet;
        let takerWallet: Wallet;

        if (config.evm.mnemonic) {
            const hdWallet = HDNodeWallet.fromPhrase(config.evm.mnemonic);
            makerWallet = new Wallet(hdWallet.privateKey, provider);
            // Derive a second wallet for the taker
            const hdWallet2 = hdWallet.derivePath("1");
            takerWallet = new Wallet(hdWallet2.privateKey, provider);
        } else {
            throw new Error('EVM_MNEMONIC not configured');
        }

        const makerAddress = await makerWallet.getAddress();
        const takerAddress = await takerWallet.getAddress();

        Logger.info(`👤 Maker wallet: ${makerAddress}`);
        Logger.info(`👤 Taker wallet: ${takerAddress}`);
        Logger.info(`⛓️  Chain ID: ${config.evm.chainId}`);

        // Check balances
        const makerBalance = await provider.getBalance(makerAddress);
        const takerBalance = await provider.getBalance(takerAddress);
        Logger.info(`💰 Maker balance: ${formatEther(makerBalance)} ETH`);
        Logger.info(`💰 Taker balance: ${formatEther(takerBalance)} ETH`);

        // Check if taker has enough balance (needs safety deposit + amount = 0.00002 ETH + gas)
        const requiredBalance = parseEther('0.00003'); // Including gas
        if (takerBalance < requiredBalance) {
            Logger.info(chalk.yellow('\n💸 Funding taker wallet...'));
            const fundingTx = await makerWallet.sendTransaction({
                to: takerAddress,
                value: requiredBalance - takerBalance
            });
            await fundingTx.wait();
            Logger.info(`✅ Funded taker wallet`);
        }

        // Create demo order
        const order = createDemoOrder(makerAddress, takerAddress);
        Logger.info(chalk.green(`\n📋 Created demo order:`));
        Logger.info(`   Order Hash: ${order.orderHash}`);
        Logger.info(`   Secret Hash: ${order.secretHash}`);
        Logger.info(`   Amount: ${formatEther(order.amount)} ETH`);
        Logger.info(`   Safety Deposit: ${formatEther(order.safetyDeposit)} ETH`);

        // Setup adapter
        const swapConfig: CrossChainSwapConfig = {
            escrowFactoryAddress: config.evm.escrowFactory,
            sourceChainId: config.evm.chainId,
            destinationChainId: config.evm.chainId, // Same chain for this demo
        };
        const adapter = new EvmAdapter(provider, swapConfig);

        // Create destination escrow immutables
        // Note: In a real cross-chain swap, the maker becomes the taker on destination
        const abiCoder = new AbiCoder();
        const parameters = abiCoder.encode(
            ['uint256', 'uint256', 'address', 'address'],
            [0, 0, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000']
        );

        const dstImmutables: EscrowImmutables = {
            orderHash: order.orderHash,
            hashlock: order.secretHash,
            maker: addressToUint256(makerAddress), // Maker becomes taker on dst
            taker: addressToUint256(takerAddress), // Taker becomes maker on dst
            token: 0n, // Native ETH
            amount: order.amount,
            safetyDeposit: order.safetyDeposit,
            timelocks: BigInt(order.timelock + 1800), // 30 minutes after src
            parameters: parameters,
        };

        // Deploy DESTINATION escrow directly via factory
        Logger.info(chalk.yellow('\n=== Deploying Destination Escrow ==='));
        Logger.info(`📍 Factory at: ${config.evm.escrowFactory}`);

        // For this demo, let's use a simple timelock structure
        // The timelocks parameter is a uint256 that encodes multiple timestamps
        const currentTime = Math.floor(Date.now() / 1000);
        const timelock = BigInt(currentTime + 3600); // 1 hour from now

        const dstTx = await takerWallet.sendTransaction({
            to: config.evm.escrowFactory,
            data: adapter.factoryInterface.encodeFunctionData('createDstEscrow', [
                dstImmutables,
                BigInt(currentTime + 7200) // 2 hours for cancellation
            ]),
            value: dstImmutables.safetyDeposit + order.amount // Safety deposit + funds
        });

        const dstReceipt = await dstTx.wait();
        if (!dstReceipt) throw new Error('Transaction receipt not found');

        Logger.info(`✅ Destination escrow deployed! TX: ${dstReceipt.hash}`);

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

        // Check balance
        const dstBalance = await provider.getBalance(dstEscrowAddress || '0x');
        Logger.info(`💰 Destination escrow balance: ${formatEther(dstBalance)} ETH`);

        // Withdraw from DESTINATION escrow
        Logger.info(chalk.yellow('\n=== Withdrawing from Destination Escrow ==='));
        Logger.info('Using the secret to withdraw funds...');

        if (dstEscrowAddress) {
            try {
                const dstWithdrawResult = await adapter.withdrawFromDestinationEscrow(
                    makerWallet,
                    dstEscrowAddress,
                    order.secret,
                    dstImmutables
                );
                Logger.info(`✅ Withdrawn! TX: ${dstWithdrawResult.transactionHash}`);

                // Check final balances
                const finalMakerBalance = await provider.getBalance(makerAddress);
                const finalDstBalance = await provider.getBalance(dstEscrowAddress);

                Logger.info(chalk.green('\n🎉 Demo completed successfully!'));
                Logger.info(`Final maker balance: ${formatEther(finalMakerBalance)} ETH`);
                Logger.info(`Final escrow balance: ${formatEther(finalDstBalance)} ETH`);
            } catch (error: any) {
                Logger.error(`❌ Withdrawal failed: ${error.message}`);
                if (error.data === '0x6f7eac26') {
                    Logger.info('📝 This is the InvalidImmutables error');
                    Logger.info('   This usually happens due to parameter encoding or timelock issues');
                }
            }
        }

    } catch (error) {
        Logger.error(`❌ Demo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(error);
        process.exit(1);
    }
}

export { main };

main().catch(console.error);