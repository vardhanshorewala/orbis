import { Address, toNano } from '@ton/core';
import { TonSourceEscrow } from '../wrappers/TonSourceEscrow';
import { NetworkProvider, compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Compile the contract
    const sourceEscrowCode = await compile('TonSourceEscrow');

    // Example configuration - replace with actual values
    const makerAddress = Address.parse('0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm'); // Your connected wallet
    const resolverAddress = Address.parse('0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm'); // Same for demo
    const targetAddress = Address.parse('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'); // Standard test address
    const refundAddress = makerAddress; // Usually the same as maker
    const jettonMaster = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'); // Null address for TON

    const sourceEscrow = provider.open(
        TonSourceEscrow.createFromConfig(
            {
                makerAddress,
                resolverAddress,
                targetAddress,
                refundAddress,
                assetType: 0, // 0 = TON, 1 = Jetton
                jettonMaster,
                amount: toNano('0.0001'), // 10 TON
                safetyDeposit: toNano('0.0001'), // 0.1 TON safety deposit
                secretHash: '0x12345678', // 4 bytes (32 bits) - minimal for testing
                timelockDuration: 3600, // 1 hour
                finalityTimelock: 600, // 10 minutes
                merkleRoot: '0x00000000', // 4 bytes (32 bits) - minimal for testing
            },
            sourceEscrowCode
        )
    );

    const deployAmount = toNano('0.001'); // Amount to send for deployment

    await sourceEscrow.sendDeploy(provider.sender(), deployAmount);

    await provider.waitForDeploy(sourceEscrow.address);

    console.log('🎉 TON Source Escrow deployed successfully!');
    console.log('📍 Contract Address:', sourceEscrow.address.toString());
    console.log('🔗 Explorer:', `https://testnet.tonscan.org/address/${sourceEscrow.address.toString()}`);

    // Contract deployed successfully!
    console.log('✅ You can now interact with the contract using the wrapper or tonlib-cli');
    console.log('📝 To test the contract, use the interaction scripts or call the methods directly');

    return sourceEscrow.address;
} 