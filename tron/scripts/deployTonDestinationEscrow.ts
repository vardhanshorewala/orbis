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

    const destinationEscrow = provider.open(
        TonDestinationEscrow.createFromConfig(
            {
                resolverAddress,
                makerAddress,
                refundAddress,
                assetType: 0, // 0 = TON, 1 = Jetton
                jettonMaster,
                amount: toNano('10'), // 10 TON
                safetyDeposit: toNano('0.1'), // 0.1 TON safety deposit
                secretHash: '0x12345678', // 4 bytes (32 bits) - minimal for testing
                timelockDuration: 3600, // 1 hour
                finalityTimelock: 600, // 10 minutes
                merkleRoot: '0x00000000', // 4 bytes (32 bits) - minimal for testing
                exclusivePeriod: 1800, // 30 minutes exclusive period for resolver
            },
            destinationEscrowCode
        )
    );

    const deployAmount = toNano('0.1'); // Amount to send for deployment

    await destinationEscrow.sendDeploy(provider.sender(), deployAmount);

    await provider.waitForDeploy(destinationEscrow.address);

    console.log('🎉 TON Destination Escrow deployed successfully!');
    console.log('📍 Contract Address:', destinationEscrow.address.toString());
    console.log('🔗 Explorer:', `https://testnet.tonscan.org/address/${destinationEscrow.address.toString()}`);

    // Contract deployed successfully!
    console.log('✅ You can now interact with the contract using the wrapper or tonlib-cli');
    console.log('📝 To test the contract, use the interaction scripts or call the methods directly');

    return destinationEscrow.address;
} 