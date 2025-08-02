import { Address, toNano } from '@ton/core';
import { TonDestinationEscrow } from '../wrappers/TonDestinationEscrow';
import { NetworkProvider, compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Compile the contract
    const destinationEscrowCode = await compile('TonDestinationEscrow');

    // Example configuration - replace with actual values
    const resolverAddress = Address.parse('0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm'); // Your connected wallet
    const makerAddress = Address.parse('0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm'); // Same for demo
    const refundAddress = resolverAddress; // Usually the same as resolver for destination
    const jettonMaster = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'); // Null address for TON

    const config = {
        resolverAddress,
        makerAddress,
        refundAddress,
        assetType: 0, // 0 = TON, 1 = Jetton
        jettonMaster,
        amount: toNano('1'), // 1 TON
        safetyDeposit: toNano('0.1'), // 0.1 TON safety deposit
        secretHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // 256-bit hash (64 hex chars)
        timelockDuration: 3600, // 1 hour
        finalityTimelock: 600, // 10 minutes
        exclusivePeriod: 1800, // 30 minutes exclusive period for resolver
    };

    const destinationEscrow = provider.open(
        TonDestinationEscrow.createFromConfig(
            config,
            destinationEscrowCode
        )
    );

    const deployAmount = toNano('1.5'); // Amount to send for deployment (must cover amount + safety deposit + gas)

    await destinationEscrow.sendDeploy(provider.sender(), deployAmount, config);

    await provider.waitForDeploy(destinationEscrow.address);

    console.log('🎉 TON Destination Escrow deployed successfully!');
    console.log('📍 Contract Address:', destinationEscrow.address.toString());
    console.log('🔗 Explorer:', `https://testnet.tonscan.org/address/${destinationEscrow.address.toString()}`);
    console.log('🔑 Secret (for testing):', 'test-secret-123'); // Remember this for testing
    console.log('🔒 Secret Hash:', '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');

    // Contract deployed successfully!
    console.log('✅ You can now interact with the contract using the wrapper or tonlib-cli');
    console.log('📝 To test the contract, use the interaction scripts or call the methods directly');

    return destinationEscrow.address;
} 