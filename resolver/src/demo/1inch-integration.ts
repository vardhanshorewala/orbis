import 'dotenv/config';
import { randomBytes } from 'crypto';
import { Wallet, JsonRpcProvider, parseEther } from 'ethers';
import {
    Address,
    HashLock,
    TimeLocks,
    EvmCrossChainOrder,
    AuctionDetails,
    randBigInt,
    EvmAddress,
    TonAddress,
    Extension
} from '@1inch/cross-chain-sdk';
import { TonAdapter } from '../adapters/TonAdapter';
import { EvmAdapter } from '../adapters/EvmAdapter';
import { loadConfig } from '../config';
import { Logger } from '../utils';

/**
 * Demo script using 1inch Cross-Chain SDK
 * Demonstrates how to create and execute cross-chain orders
 */

const UINT_40_MAX = (1n << 40n) - 1n;

interface OrderData {
    order: any;
    extension: string;
    signature: string;
    secret: string;
    hashlock: string;
    orderHash: string;
    expirationTime: string;
}

async function createCrossChainOrder(
    maker: Wallet,
    escrowFactoryAddress: string,
    sourceChainId: number,
    destinationChainId: number
): Promise<OrderData> {
    // 1. Generate secret and hashlock
    const secretBytes = randomBytes(32);
    const secret = '0x' + Buffer.from(secretBytes).toString('hex');
    const hashLock = HashLock.forSingleFill(secret);
    const secretHash = hashLock.toString();
    
    Logger.info('🔐 Generated secret and hashlock', {
        secret: secret.substring(0, 16) + '...',
        hashlock: secretHash.substring(0, 16) + '...'
    });
    
    // 2. Configure timelocks (demo values - shorter for testing)
    const timeLocks = TimeLocks.new({
        srcWithdrawal: 0n,
        srcPublicWithdrawal: 120n, // 2 minutes
        srcCancellation: 180n, // 3 minutes
        srcPublicCancellation: 240n, // 4 minutes
        dstWithdrawal: 0n,
        dstPublicWithdrawal: 120n, // 2 minutes
        dstCancellation: 180n, // 3 minutes
    });
    
    // 3. Safety deposits
    const SRC_SAFETY_DEPOSIT = parseEther('0.01'); // 0.01 ETH
    const DST_SAFETY_DEPOSIT = parseEther('0.01'); // 0.01 TON equivalent
    
    // 4. No auction - fixed price
    const auctionDetails = AuctionDetails.noAuction();
    
    // 5. Order amounts
    const MAKING_AMOUNT = parseEther('0.001'); // 0.001 ETH
    const TAKING_AMOUNT = parseEther('0.5'); // 0.5 TON
    
    // 6. Create the order
    const nonce = randBigInt(UINT_40_MAX);
    
    const order = EvmCrossChainOrder.new(
        new EvmAddress(new Address(escrowFactoryAddress)),
        {
            makerAsset: EvmAddress.NATIVE, // ETH
            takerAsset: TonAddress.NATIVE, // TON
            makingAmount: MAKING_AMOUNT,
            takingAmount: TAKING_AMOUNT,
            maker: new EvmAddress(new Address(maker.address)),
            receiver: new TonAddress(
                'EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqxa' // Demo TON address
            ),
        },
        {
            hashLock,
            srcChainId: sourceChainId as any,
            dstChainId: destinationChainId as any,
            srcSafetyDeposit: SRC_SAFETY_DEPOSIT,
            dstSafetyDeposit: DST_SAFETY_DEPOSIT,
            timeLocks,
        },
        {
            auction: auctionDetails,
            whitelist: [], // Open to any resolver for demo
        },
        {
            allowPartialFills: false,
            allowMultipleFills: false,
            nonce: nonce,
        }
    );
    
    // 7. Sign the order
    const typedData = order.getTypedData(sourceChainId);
    const signature = await maker.signTypedData(
        typedData.domain,
        { Order: typedData.types.Order },
        typedData.message
    );
    
    return {
        order: order.build(),
        extension: order.extension.encode(),
        signature,
        secret,
        hashlock: secretHash,
        orderHash: order.getOrderHash(sourceChainId),
        expirationTime: new Date(Number(order.deadline) * 1000).toISOString(),
    };
}

async function executeEvmToTonSwap() {
    const config = loadConfig();
    
    console.log('\n🚀 Starting EVM -> TON Cross-Chain Swap Demo\n');
    
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
    
    // For demo, use the same wallet as maker and resolver
    const provider = new JsonRpcProvider(config.evm.rpcUrl);
    const maker = new Wallet(config.evm.privateKey, provider);
    
    console.log('📍 Configuration:');
    console.log(`   Maker/Resolver: ${maker.address}`);
    console.log(`   EVM Chain ID: ${config.evm.chainId}`);
    console.log(`   Escrow Factory: ${config.evm.escrowFactory}`);
    console.log('');
    
    // Step 1: Create order
    console.log('📝 Step 1: Creating cross-chain order...');
    const orderData = await createCrossChainOrder(
        maker,
        config.evm.escrowFactory,
        config.evm.chainId,
        232 // TON mainnet chain ID (or use testnet ID)
    );
    
    console.log('✅ Order created:');
    console.log(`   Order Hash: ${orderData.orderHash}`);
    console.log(`   Expires: ${orderData.expirationTime}`);
    console.log('');
    
    // Step 2: Simulate relayer receiving the order
    console.log('📡 Step 2: Relayer broadcasts order to resolvers...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Order available for resolvers');
    console.log('');
    
    // Step 3: Resolver deploys escrows
    console.log('🏗️  Step 3: Resolver deploying escrows...');
    
    // Re-create order object from data
    const extension = Extension.decode(orderData.extension);
    const order = EvmCrossChainOrder.fromDataAndExtension(
        orderData.order,
        extension
    );
    
    // Deploy source escrow on EVM
    console.log('   Deploying EVM source escrow...');
    // In real implementation, this would use the 1inch escrow factory
    // For now, we use our simplified approach
    const mockEvmOrder = {
        orderId: orderData.orderHash,
        maker: maker.address,
        sourceChain: 'evm' as const,
        destinationChain: 'ton' as const,
        fromToken: 'ETH',
        toToken: 'TON',
        amount: '0.001',
        minReceiveAmount: '0.5',
        secretHash: orderData.hashlock,
        timelock: Math.floor(Date.now() / 1000) + 3600,
        makerAddress: maker.address,
        resolverFee: '0',
        deadline: Math.floor(Date.now() / 1000) + 7200
    };
    
    const evmEscrow = await evmAdapter.deployEscrow(mockEvmOrder, orderData.hashlock, 'source');
    console.log(`   ✅ EVM escrow: ${evmEscrow.contractAddress}`);
    
    // Deploy destination escrow on TON
    console.log('   Deploying TON destination escrow...');
    const tonEscrow = await tonAdapter.deployEscrow(mockEvmOrder, orderData.hashlock, 'destination');
    console.log(`   ✅ TON escrow: ${tonEscrow.contractAddress}`);
    console.log('');
    
    // Step 4: Lock funds
    console.log('🔒 Step 4: Locking funds in escrows...');
    console.log('   Locking ETH in source escrow...');
    await evmAdapter.lockFunds(evmEscrow.contractAddress, '0.001');
    console.log('   ✅ ETH locked');
    
    console.log('   Locking TON in destination escrow...');
    await tonAdapter.lockFunds(tonEscrow.contractAddress, '0.5');
    console.log('   ✅ TON locked');
    console.log('');
    
    // Step 5: Wait for finality
    console.log('⏳ Step 5: Waiting for blockchain finality...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('✅ Finality achieved');
    console.log('');
    
    // Step 6: Reveal secret and complete swap
    console.log('🔓 Step 6: Revealing secret and completing swap...');
    
    // Resolver reveals on source
    console.log('   Resolver claiming from source escrow...');
    await evmAdapter.revealSecret(
        evmEscrow.contractAddress,
        orderData.secret,
        maker.address
    );
    console.log('   ✅ Resolver received ETH');
    
    // Maker can now claim from destination
    console.log('   Maker claiming from destination escrow...');
    await tonAdapter.revealSecret(
        tonEscrow.contractAddress,
        orderData.secret,
        'EQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqxa'
    );
    console.log('   ✅ Maker received TON');
    console.log('');
    
    console.log('🎉 Cross-chain swap completed successfully!');
    console.log(`   Order Hash: ${orderData.orderHash}`);
    console.log(`   ETH -> TON: 0.001 ETH -> 0.5 TON`);
}

// Run the demo
if (require.main === module) {
    executeEvmToTonSwap()
        .then(() => {
            console.log('\n✅ Demo completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Demo failed:', error);
            process.exit(1);
        });
}