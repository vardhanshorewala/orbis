import { Address, toNano } from '@ton/core';
import { TonSourceEscrow } from '../wrappers/TonSourceEscrow';
import { NetworkProvider, compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Compile the contract
    const sourceEscrowCode = await compile('ton_source_escrow');

    // Example configuration - replace with actual values
    const makerAddress = Address.parse('kQD4B7Q0_dP_7tl8crnGjYyMGF9RcK_EgBp7_CQ_b4QwKxSY');
    const resolverAddress = Address.parse('kQA0KqQqPkR4D2YhUqrKO5TuIdS7EuExO8B-nCFFVLEfqjW7');
    const targetAddress = Address.parse('kQBeWrPv_fOSI59jujF_LBxaZDv1MHRFS8HSCRyRXz5sGh2T');
    const refundAddress = makerAddress; // Usually the same as maker
    const jettonMaster = Address.parse('kQD4B7Q0_dP_7tl8crnGjYyMGF9RcK_EgBp7_CQ_b4QwKxSY'); // Use null address for TON

    const sourceEscrow = provider.open(
        TonSourceEscrow.createFromConfig(
            {
                makerAddress,
                resolverAddress,
                targetAddress,
                refundAddress,
                assetType: 0, // 0 = TON, 1 = Jetton
                jettonMaster,
                amount: toNano('10'), // 10 TON
                safetyDeposit: toNano('0.1'), // 0.1 TON safety deposit
                secretHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                timelockDuration: 3600, // 1 hour
                finalityTimelock: 600, // 10 minutes
                merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
            },
            sourceEscrowCode
        )
    );

    const deployAmount = toNano('0.5'); // Amount to send for deployment

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