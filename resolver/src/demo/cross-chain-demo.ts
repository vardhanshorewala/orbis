import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Wallet, JsonRpcProvider, parseEther, keccak256 } from 'ethers';
import { TonAdapter } from '../adapters/TonAdapter';
import { EvmAdapter } from '../adapters/EvmAdapter';
import { loadConfig } from '../config';
import { Logger } from '../utils';
import { CrossChainSwapOrder } from '../types';

/**
 * Cross-chain demo showing the complete flow
 * Similar to moleswap example but adapted for our architecture
 */

interface OrderData {
    order: CrossChainSwapOrder;
    secret: string;
    hashlock: string;
    orderHash: string;
}

/**
 * Create a cross-chain order
 */
function createCrossChainOrder(
    maker: string,
    receiver: string,
    sourceChain: 'evm' | 'ton',
    destinationChain: 'evm' | 'ton'
): OrderData {
    // Generate secret and hashlock
    const secretBytes = randomBytes(32);
    const secret = '0x' + secretBytes.toString('hex');
    const hashlock = keccak256(secretBytes);

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Math.floor(Date.now() / 1000);

    const order: CrossChainSwapOrder = {
        orderId,
        maker,
        sourceChain,
        destinationChain,
        fromToken: sourceChain === 'evm' ? 'ETH' : 'TON',
        toToken: destinationChain === 'evm' ? 'ETH' : 'TON',
        amount: sourceChain === 'evm' ? '0.001' : '1', // 0.001 ETH or 1 TON
        minReceiveAmount: destinationChain === 'evm' ? '0.002' : '0.5', // Simple exchange rate
        secretHash: hashlock,
        timelock: now + 3600, // 1 hour
        makerAddress: maker,
        resolverFee: parseEther('0.0001').toString(), // Small fee
        deadline: now + 7200 // 2 hours
    };

    return {
        order,
        secret,
        hashlock,
        orderHash: keccak256(Buffer.from(orderId))
    };
}

/**
 * Execute EVM to TON swap
 */
async function executeEvmToTonSwap() {
    console.log('\n🚀 Executing EVM -> TON Cross-Chain Swap\n');

    const config = loadConfig();

    // Initialize adapters
    const evmAdapter = new EvmAdapter({
        rpcUrl: config.evm.rpcUrl,
        privateKey: config.evm.privateKey,
        chainId: config.evm.chainId,
        escrowFactoryAddress: config.evm.escrowFactory
    });
    await evmAdapter.initialize();

    const tonAdapter = new TonAdapter({
        rpcUrl: config.ton.rpcUrl,
        apiKey: config.ton.apiKey,
        privateKey: config.ton.privateKey,
        sourceEscrowCode: config.ton.sourceEscrowTemplate,
        destinationEscrowCode: config.ton.destinationEscrowTemplate
    });
    await tonAdapter.initialize();

    const evmAddress = await evmAdapter.getAddress();
    const tonAddress = await tonAdapter.getAddress();

    console.log('📍 Addresses:');
    console.log(`   EVM Resolver: ${evmAddress}`);
    console.log(`   TON Resolver: ${tonAddress}`);
    console.log('');

    // Create order
    const orderData = createCrossChainOrder(
        evmAddress, // Maker on EVM
        tonAddress, // Receiver on TON
        'evm',
        'ton'
    );

    console.log('📋 Order created:');
    console.log(`   Order ID: ${orderData.order.orderId}`);
    console.log(`   ${orderData.order.amount} ${orderData.order.fromToken} -> ${orderData.order.minReceiveAmount} ${orderData.order.toToken}`);
    console.log(`   Secret hash: ${orderData.hashlock.substring(0, 16)}...`);
    console.log('');

    // Phase 1: Deploy escrows
    console.log('📝 Phase 1: Deploying escrows...\n');

    console.log('   Deploying source escrow on EVM...');
    const evmEscrow = await evmAdapter.deployEscrow(orderData.order, orderData.hashlock, 'source');
    console.log(`   ✅ EVM escrow: ${evmEscrow.contractAddress}`);

    console.log('   Deploying destination escrow on TON...');
    const tonEscrow = await tonAdapter.deployEscrow(orderData.order, orderData.hashlock, 'destination');
    console.log(`   ✅ TON escrow: ${tonEscrow.contractAddress}`);
    console.log('');

    // Phase 2: Lock funds
    console.log('💰 Phase 2: Locking funds...\n');

    console.log('   Maker locking ETH in source escrow...');
    await evmAdapter.lockFunds(evmEscrow.contractAddress, orderData.order.amount);
    console.log('   ✅ ETH locked');

    console.log('   Resolver locking TON in destination escrow...');
    await tonAdapter.lockFunds(tonEscrow.contractAddress, orderData.order.minReceiveAmount);
    console.log('   ✅ TON locked');
    console.log('');

    // Wait for finality
    console.log('⏳ Waiting for blockchain finality (10 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('');

    // Phase 3: Reveal secret and withdraw
    console.log('🔓 Phase 3: Revealing secret and withdrawing...\n');

    console.log('   Resolver revealing secret on source chain...');
    await evmAdapter.revealSecret(evmEscrow.contractAddress, orderData.secret, evmAddress);
    console.log('   ✅ Resolver received ETH');

    console.log('   Maker claiming from destination using revealed secret...');
    await tonAdapter.revealSecret(tonEscrow.contractAddress, orderData.secret, tonAddress);
    console.log('   ✅ Maker received TON');
    console.log('');

    console.log('🎉 EVM -> TON swap completed successfully!');
    console.log(`   Maker sent: ${orderData.order.amount} ETH`);
    console.log(`   Maker received: ${orderData.order.minReceiveAmount} TON`);
    console.log(`   Resolver fee: ${parseEther(orderData.order.resolverFee)} ETH`);
}

/**
 * Execute TON to EVM swap
 */
async function executeTonToEvmSwap() {
    console.log('\n🚀 Executing TON -> EVM Cross-Chain Swap\n');

    const config = loadConfig();

    // Initialize adapters
    const evmAdapter = new EvmAdapter({
        rpcUrl: config.evm.rpcUrl,
        privateKey: config.evm.privateKey,
        chainId: config.evm.chainId,
        escrowFactoryAddress: config.evm.escrowFactory
    });
    await evmAdapter.initialize();

    const tonAdapter = new TonAdapter({
        rpcUrl: config.ton.rpcUrl,
        apiKey: config.ton.apiKey,
        privateKey: config.ton.privateKey,
        sourceEscrowCode: config.ton.sourceEscrowTemplate,
        destinationEscrowCode: config.ton.destinationEscrowTemplate
    });
    await tonAdapter.initialize();

    const evmAddress = await evmAdapter.getAddress();
    const tonAddress = await tonAdapter.getAddress();

    // Create order
    const orderData = createCrossChainOrder(
        tonAddress, // Maker on TON
        evmAddress, // Receiver on EVM
        'ton',
        'evm'
    );

    console.log('📋 Order created:');
    console.log(`   Order ID: ${orderData.order.orderId}`);
    console.log(`   ${orderData.order.amount} ${orderData.order.fromToken} -> ${orderData.order.minReceiveAmount} ${orderData.order.toToken}`);
    console.log('');

    // Deploy and execute swap...
    console.log('📝 Phase 1: Deploying escrows...\n');

    const tonEscrow = await tonAdapter.deployEscrow(orderData.order, orderData.hashlock, 'source');
    console.log(`   ✅ TON source escrow: ${tonEscrow.contractAddress}`);

    const evmEscrow = await evmAdapter.deployEscrow(orderData.order, orderData.hashlock, 'destination');
    console.log(`   ✅ EVM destination escrow: ${evmEscrow.contractAddress}`);
    console.log('');

    console.log('💰 Phase 2: Locking funds...\n');
    await tonAdapter.lockFunds(tonEscrow.contractAddress, orderData.order.amount);
    console.log('   ✅ TON locked');

    await evmAdapter.lockFunds(evmEscrow.contractAddress, orderData.order.minReceiveAmount);
    console.log('   ✅ ETH locked');
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('🔓 Phase 3: Revealing secret and withdrawing...\n');
    await tonAdapter.revealSecret(tonEscrow.contractAddress, orderData.secret, tonAddress);
    console.log('   ✅ Resolver received TON');

    await evmAdapter.revealSecret(evmEscrow.contractAddress, orderData.secret, evmAddress);
    console.log('   ✅ Maker received ETH');
    console.log('');

    console.log('🎉 TON -> EVM swap completed successfully!');
}

/**
 * Main demo runner
 */
export async function runCrossChainDemo() {
    try {
        console.log('='.repeat(60));
        console.log('   1inch Fusion+ Cross-Chain Swap Demo');
        console.log('   TON <-> EVM Atomic Swaps');
        console.log('='.repeat(60));

        // Run EVM to TON swap
        await executeEvmToTonSwap();

        console.log('\n' + '-'.repeat(60) + '\n');

        // Run TON to EVM swap
        await executeTonToEvmSwap();

        console.log('\n' + '='.repeat(60));
        console.log('   ✅ All demos completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Demo failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    runCrossChainDemo()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}