import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Wallet, JsonRpcProvider, parseEther, formatEther } from 'ethers';
import { Address as TonAddress, toNano, fromNano } from '@ton/ton';
import {
    CrossChainSwapOrder,
    EscrowDeployment,
    ExecutionStatus,
    EscrowStatus
} from '../types';
import { Logger, SecretManager } from '../utils';
import { TonResolver } from '../resolver';
import { loadConfig } from '../config';
import { TonAdapter } from '../adapters/TonAdapter';
import { EvmAdapter } from '../adapters/EvmAdapter';

/**
 * End-to-end demonstration of TON <-> EVM cross-chain swap
 */

// Helper to create a demo order
function createDemoOrder(config: {
    makerAddress: string;
    resolverAddress: string;
    fromChain: 'ton' | 'evm';
    toChain: 'ton' | 'evm';
    fromToken: string;
    toToken: string;
    amount: string;
    minReceiveAmount: string;
}): CrossChainSwapOrder {
    const orderId = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Math.floor(Date.now() / 1000);

    return {
        orderId,
        maker: config.makerAddress,
        sourceChain: config.fromChain,
        destinationChain: config.toChain,
        fromToken: config.fromToken,
        toToken: config.toToken,
        amount: config.amount,
        minReceiveAmount: config.minReceiveAmount,
        secretHash: '', // Will be set by resolver
        timelock: now + 3600, // 1 hour
        makerAddress: config.makerAddress,
        resolverFee: parseEther('0.001').toString(), // 0.001 ETH/TON fee
        deadline: now + 7200 // 2 hours
    };
}

async function main() {
    console.log('🚀 Starting end-to-end cross-chain swap demo\n');

    try {
        // Load configuration
        const config = loadConfig();

        // Initialize adapters
        console.log('📡 Initializing blockchain adapters...');
        const tonAdapter = new TonAdapter({
            rpcUrl: config.ton.rpcUrl,
            apiKey: config.ton.apiKey,
            privateKey: config.ton.privateKey,
            sourceEscrowCode: config.ton.sourceEscrowTemplate,
            destinationEscrowCode: config.ton.destinationEscrowTemplate
        });
        await tonAdapter.initialize();

        const evmAdapter = new EvmAdapter({
            rpcUrl: config.evm.rpcUrl,
            privateKey: config.evm.privateKey,
            mnemonic: config.evm.mnemonic,
            chainId: config.evm.chainId,
            escrowFactoryAddress: config.evm.escrowFactory
        });
        await evmAdapter.initialize();

        // Get addresses
        const tonResolverAddress = await tonAdapter.getAddress();
        const evmResolverAddress = await evmAdapter.getAddress();

        console.log('✅ Adapters initialized');
        console.log(`   TON Resolver: ${tonResolverAddress}`);
        console.log(`   EVM Resolver: ${evmResolverAddress}`);
        console.log('');

        // Check balances
        const tonBalance = await tonAdapter.getBalance();
        const evmBalance = await evmAdapter.getBalance();

        console.log('💰 Resolver Balances:');
        console.log(`   TON: ${tonBalance} TON`);
        console.log(`   EVM: ${evmBalance} ETH`);
        console.log('');

        // ----------------------------------------------------------------------------
        // SCENARIO 1: EVM -> TON Swap
        // Maker has ETH/USDC on EVM, wants TON
        // ----------------------------------------------------------------------------
        console.log('=== SCENARIO 1: EVM -> TON Cross-Chain Swap ===\n');

        // Create order (normally this would come from the maker via relayer)
        const evmToTonOrder = createDemoOrder({
            makerAddress: evmResolverAddress, // Using resolver as maker for demo
            resolverAddress: evmResolverAddress,
            fromChain: 'evm',
            toChain: 'ton',
            fromToken: 'ETH',
            toToken: 'TON',
            amount: '0.001', // 0.001 ETH
            minReceiveAmount: '0.5' // 0.5 TON (simplified pricing)
        });

        console.log('📋 Order created:');
        console.log(`   Order ID: ${evmToTonOrder.orderId}`);
        console.log(`   ${evmToTonOrder.amount} ${evmToTonOrder.fromToken} -> ${evmToTonOrder.minReceiveAmount} ${evmToTonOrder.toToken}`);
        console.log('');

        // Initialize resolver
        const resolver = new TonResolver(config);

        // Generate secret and hash
        const secretManager = new SecretManager();
        const secret = secretManager.generateSecret();
        const secretHash = secretManager.hashSecret(secret);
        evmToTonOrder.secretHash = secretHash;

        console.log('🔐 Secret generated:');
        console.log(`   Secret: ${secret.substring(0, 16)}...`);
        console.log(`   Hash: ${secretHash.substring(0, 16)}...`);
        console.log('');

        // Step 1: Deploy source escrow on EVM
        console.log('🏗️  Step 1: Deploying source escrow on EVM...');
        const evmSourceEscrow = await evmAdapter.deployEscrow(evmToTonOrder, secretHash, 'source');
        console.log(`✅ EVM source escrow deployed: ${evmSourceEscrow.contractAddress}`);
        console.log('');

        // Step 2: Deploy destination escrow on TON
        console.log('🏗️  Step 2: Deploying destination escrow on TON...');
        const tonDestEscrow = await tonAdapter.deployEscrow(evmToTonOrder, secretHash, 'destination');
        console.log(`✅ TON destination escrow deployed: ${tonDestEscrow.contractAddress}`);
        console.log('');

        // Step 3: Lock maker's funds in source escrow
        console.log('🔒 Step 3: Locking maker funds in source escrow...');
        await evmAdapter.lockFunds(evmSourceEscrow.contractAddress, evmToTonOrder.amount);
        console.log('✅ Funds locked on EVM');
        console.log('');

        // Step 4: Lock resolver's funds in destination escrow
        console.log('🔒 Step 4: Locking resolver funds in destination escrow...');
        await tonAdapter.lockFunds(tonDestEscrow.contractAddress, evmToTonOrder.minReceiveAmount);
        console.log('✅ Funds locked on TON');
        console.log('');

        // Wait for finality
        console.log('⏳ Waiting for blockchain finality (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Step 5: Resolver reveals secret and claims from source
        console.log('🔓 Step 5: Resolver revealing secret on source chain...');
        await evmAdapter.revealSecret(
            evmSourceEscrow.contractAddress,
            secret,
            evmResolverAddress
        );
        console.log('✅ Resolver claimed funds from EVM');
        console.log('');

        // Step 6: Maker can now claim from destination using revealed secret
        console.log('🔓 Step 6: Maker can now claim from destination...');
        // In real scenario, maker would do this themselves
        // For demo, we simulate it
        await tonAdapter.revealSecret(
            tonDestEscrow.contractAddress,
            secret,
            tonResolverAddress // Maker's TON address
        );
        console.log('✅ Maker claimed funds from TON');
        console.log('');

        console.log('🎉 EVM -> TON swap completed successfully!\n');

        // ----------------------------------------------------------------------------
        // SCENARIO 2: TON -> EVM Swap
        // Maker has TON, wants ETH/USDC on EVM
        // ----------------------------------------------------------------------------
        console.log('=== SCENARIO 2: TON -> EVM Cross-Chain Swap ===\n');

        const tonToEvmOrder = createDemoOrder({
            makerAddress: tonResolverAddress, // Using resolver as maker for demo
            resolverAddress: tonResolverAddress,
            fromChain: 'ton',
            toChain: 'evm',
            fromToken: 'TON',
            toToken: 'ETH',
            amount: '1', // 1 TON
            minReceiveAmount: '0.002' // 0.002 ETH (simplified pricing)
        });

        console.log('📋 Order created:');
        console.log(`   Order ID: ${tonToEvmOrder.orderId}`);
        console.log(`   ${tonToEvmOrder.amount} ${tonToEvmOrder.fromToken} -> ${tonToEvmOrder.minReceiveAmount} ${tonToEvmOrder.toToken}`);
        console.log('');

        // Generate new secret
        const secret2 = secretManager.generateSecret();
        const secretHash2 = secretManager.hashSecret(secret2);
        tonToEvmOrder.secretHash = secretHash2;

        // Step 1: Deploy source escrow on TON
        console.log('🏗️  Step 1: Deploying source escrow on TON...');
        const tonSourceEscrow = await tonAdapter.deployEscrow(tonToEvmOrder, secretHash2, 'source');
        console.log(`✅ TON source escrow deployed: ${tonSourceEscrow.contractAddress}`);
        console.log('');

        // Step 2: Deploy destination escrow on EVM
        console.log('🏗️  Step 2: Deploying destination escrow on EVM...');
        const evmDestEscrow = await evmAdapter.deployEscrow(tonToEvmOrder, secretHash2, 'destination');
        console.log(`✅ EVM destination escrow deployed: ${evmDestEscrow.contractAddress}`);
        console.log('');

        // Continue with locking and revealing...
        console.log('🔒 Step 3: Locking maker funds in source escrow...');
        await tonAdapter.lockFunds(tonSourceEscrow.contractAddress, tonToEvmOrder.amount);
        console.log('✅ Funds locked on TON');
        console.log('');

        console.log('🔒 Step 4: Locking resolver funds in destination escrow...');
        await evmAdapter.lockFunds(evmDestEscrow.contractAddress, tonToEvmOrder.minReceiveAmount);
        console.log('✅ Funds locked on EVM');
        console.log('');

        // Wait for finality
        console.log('⏳ Waiting for blockchain finality (10 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Reveal secrets
        console.log('🔓 Step 5: Resolver revealing secret on source chain...');
        await tonAdapter.revealSecret(
            tonSourceEscrow.contractAddress,
            secret2,
            tonResolverAddress
        );
        console.log('✅ Resolver claimed funds from TON');
        console.log('');

        console.log('🔓 Step 6: Maker can now claim from destination...');
        await evmAdapter.revealSecret(
            evmDestEscrow.contractAddress,
            secret2,
            evmResolverAddress
        );
        console.log('✅ Maker claimed funds from EVM');
        console.log('');

        console.log('🎉 TON -> EVM swap completed successfully!\n');

        // Final balances
        const finalTonBalance = await tonAdapter.getBalance();
        const finalEvmBalance = await evmAdapter.getBalance();

        console.log('💰 Final Resolver Balances:');
        console.log(`   TON: ${finalTonBalance} TON (was ${tonBalance})`);
        console.log(`   EVM: ${finalEvmBalance} ETH (was ${evmBalance})`);

    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    main().catch(console.error);
}

export { main };