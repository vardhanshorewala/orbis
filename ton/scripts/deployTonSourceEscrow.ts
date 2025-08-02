import { Address, toNano, beginCell } from '@ton/core';
import { TonSourceEscrow } from '../wrappers/TonSourceEscrow';
import { NetworkProvider, compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Compile the contract
    const sourceEscrowCode = await compile('TonSourceEscrow');

    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error('Sender address not found');
    }

    // Using sender address for all roles in this test deployment
    const makerAddress = senderAddress;
    const resolverAddress = senderAddress;
    const targetAddress = senderAddress;
    const refundAddress = senderAddress;
    const jettonMaster = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'); // Null address for TON

    ui.write('Deploy TON Source Escrow contract');

    // Configuration
    const escrowAmount = toNano('0.1'); // 0.1 TON escrow amount
    const safetyDeposit = toNano('0.05'); // 0.05 TON safety deposit
    
    // Calculate the hash of the secret
    const testSecret = "test123"; // Our test secret
    const secretCell = beginCell()
        .storeUint(Buffer.from(testSecret).readUInt32BE(0), 32) // Store first 4 bytes as uint32
        .endCell();
    const secretHashBuffer = secretCell.hash();
    const secretHashBigInt = BigInt('0x' + secretHashBuffer.toString('hex'));
    const secretHash32 = Number(secretHashBigInt >> 224n); // Take first 32 bits
    const secretHashHex = secretHash32.toString(16).padStart(8, '0');
    
    console.log('🔐 Secret details:');
    console.log('   - Test secret:', testSecret);
    console.log('   - Secret hash (32-bit):', '0x' + secretHashHex);
    
    const sourceEscrow = provider.open(
        TonSourceEscrow.createFromConfig(
            {
                makerAddress,
                resolverAddress,
                targetAddress,
                refundAddress,
                assetType: 0, // 0 = TON, 1 = Jetton
                jettonMaster,
                amount: escrowAmount,
                safetyDeposit: safetyDeposit,
                secretHash: secretHashHex, // Use calculated hash
                timelockDuration: 3600, // 1 hour
                finalityTimelock: 10, // 10 seconds for testing
            },
            sourceEscrowCode
        )
    );

    // Calculate deployment amount
    // Must include: escrow amount + safety deposit + gas for operations
    const gasReserve = toNano('0.1'); // 0.1 TON for gas and storage
    const deployAmount = escrowAmount + safetyDeposit + gasReserve;
    
    console.log('💰 Deployment details:');
    console.log('   - Escrow amount:', escrowAmount.toString(), 'nanoTON (0.1 TON)');
    console.log('   - Safety deposit:', safetyDeposit.toString(), 'nanoTON (0.05 TON)');
    console.log('   - Gas reserve:', gasReserve.toString(), 'nanoTON (0.1 TON)');
    console.log('   - Total deployment amount:', deployAmount.toString(), 'nanoTON (0.25 TON)');

    await sourceEscrow.sendDeploy(provider.sender(), deployAmount);

    await provider.waitForDeploy(sourceEscrow.address);

    console.log('🎉 TON Source Escrow deployed successfully!');
    console.log('📍 Contract Address:', sourceEscrow.address.toString());
    console.log('🔗 Explorer:', `https://testnet.tonscan.org/address/${sourceEscrow.address.toString()}`);
    console.log('💰 Escrow Amount:', '0.1 TON');
    console.log('🛡️ Safety Deposit:', '0.05 TON');
    console.log('🔑 Secret (for testing):', testSecret);
    console.log('🔒 Secret Hash (32-bit):', '0x' + secretHashHex);
    console.log('⏰ Timelock Duration:', '1 hour');
    console.log('⏰ Finality Timelock:', '10 seconds');

    // Contract deployed successfully!
    console.log('\n✅ Contract is now active and ready to use!');
    console.log('📝 Next steps:');
    console.log('   1. Wait for finality period (10 seconds) then lock the escrow');
    console.log('   2. Use the secret "' + testSecret + '" to withdraw funds');
    console.log('   3. Or wait for timeout (1 hour) to refund');

    return sourceEscrow.address;
} 