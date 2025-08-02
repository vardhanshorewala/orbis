import { Address, toNano, beginCell } from '@ton/core';
import { TonDestinationEscrow } from '../wrappers/TonDestinationEscrow';
import { NetworkProvider, compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Compile the contract
    const destinationEscrowCode = await compile('TonDestinationEscrow');

    const senderAddress = provider.sender().address;
    if (!senderAddress) {
        throw new Error('Sender address not found');
    }

    // For destination escrow, resolver deposits their own assets
    const resolverAddress = senderAddress; // Resolver is the one deploying
    const makerAddress = senderAddress; // For testing, same address
    const refundAddress = senderAddress; // Where to refund resolver
    const jettonMaster = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'); // Null address for TON

    ui.write('Deploy TON Destination Escrow contract');

    // Configuration
    const escrowAmount = toNano('0.5'); // 0.5 TON escrow amount (resolver's funds)
    const safetyDeposit = toNano('0.1'); // 0.1 TON safety deposit
    
    // Calculate the hash of the secret (same as source for testing)
    const testSecret = "test123"; // Same secret as source
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

    const destinationEscrow = provider.open(
        TonDestinationEscrow.createFromConfig(
            {
                resolverAddress,
                makerAddress,
                refundAddress,
                assetType: 0, // 0 = TON, 1 = Jetton
                jettonMaster,
                amount: escrowAmount,
                safetyDeposit: safetyDeposit,
                secretHash: secretHashHex, // Use calculated hash
                timelockDuration: 1800, // 30 minutes (shorter than source)
                finalityTimelock: 10, // 10 seconds for testing
                exclusivePeriod: 300, // 5 minutes exclusive period for resolver
            },
            destinationEscrowCode
        )
    );

    // Calculate deployment amount
    // Must include: escrow amount + safety deposit + gas for operations
    const gasReserve = toNano('0.1'); // 0.1 TON for gas and storage
    const deployAmount = escrowAmount + safetyDeposit + gasReserve;
    
    console.log('💰 Deployment details:');
    console.log('   - Escrow amount:', escrowAmount.toString(), 'nanoTON (0.5 TON)');
    console.log('   - Safety deposit:', safetyDeposit.toString(), 'nanoTON (0.1 TON)');
    console.log('   - Gas reserve:', gasReserve.toString(), 'nanoTON (0.1 TON)');
    console.log('   - Total deployment amount:', deployAmount.toString(), 'nanoTON (0.7 TON)');

    await destinationEscrow.sendDeploy(provider.sender(), deployAmount);

    await provider.waitForDeploy(destinationEscrow.address);

    console.log('🎉 TON Destination Escrow deployed successfully!');
    console.log('📍 Contract Address:', destinationEscrow.address.toString());
    console.log('🔗 Explorer:', `https://testnet.tonscan.org/address/${destinationEscrow.address.toString()}`);
    console.log('💰 Escrow Amount:', '0.5 TON (resolver funds)');
    console.log('🛡️ Safety Deposit:', '0.1 TON');
    console.log('🔑 Secret (for testing):', testSecret);
    console.log('🔒 Secret Hash (32-bit):', '0x' + secretHashHex);
    console.log('⏰ Timelock Duration:', '30 minutes (shorter than source)');
    console.log('⏰ Finality Timelock:', '10 seconds');
    console.log('⏰ Exclusive Period:', '5 minutes');

    // Contract deployed successfully!
    console.log('\n✅ Contract is now active and ready to use!');
    console.log('📝 Next steps:');
    console.log('   1. Wait for finality period (10 seconds) then lock the escrow');
    console.log('   2. Share the secret "' + testSecret + '" with the maker');
    console.log('   3. Resolver has 5 minutes exclusive period to withdraw');
    console.log('   4. After exclusive period, anyone with secret can withdraw');
    console.log('   5. Or wait for timeout (30 minutes) to refund');

    return destinationEscrow.address;
} 