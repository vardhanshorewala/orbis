import { Address, toNano } from '@ton/core';
import { TonSourceEscrow } from '../wrappers/TonSourceEscrow';
import { TonDestinationEscrow } from '../wrappers/TonDestinationEscrow';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // Get contract address from command line argument or ask user
    const contractAddress = args.length > 0 
        ? Address.parse(args[0])
        : Address.parse(await ui.input('Contract address'));

    // Ask user which type of contract to interact with
    const contractType = await ui.choose('Contract type:', ['Source Escrow', 'Destination Escrow'], (c) => c);

    if (contractType === 'Source Escrow') {
        await interactWithSourceEscrow(provider, contractAddress);
    } else {
        await interactWithDestinationEscrow(provider, contractAddress);
    }
}

async function interactWithSourceEscrow(provider: NetworkProvider, contractAddress: Address) {
    const ui = provider.ui();
    const sourceEscrow = provider.open(TonSourceEscrow.createFromAddress(contractAddress));

    const action = await ui.choose('Choose action:', [
        'Get Escrow Details',
        'Check Can Withdraw',
        'Check Can Refund',
        'Send Lock',
        'Send Withdraw',
        'Send Refund'
    ], (a) => a);

    try {
        switch (action) {
            case 'Get Escrow Details':
                const details = await sourceEscrow.getEscrowDetails();
                ui.write('📊 Escrow Details:');
                ui.write(`   Status: ${details.status}`);
                ui.write(`   Amount: ${details.amount.toString()} nanotons`);
                ui.write(`   Maker: ${details.makerAddress.toString()}`);
                ui.write(`   Resolver: ${details.resolverAddress.toString()}`);
                ui.write(`   Target: ${details.targetAddress.toString()}`);
                ui.write(`   Refund: ${details.refundAddress.toString()}`);
                ui.write(`   Asset Type: ${details.assetType}`);
                ui.write(`   Jetton Master: ${details.jettonMaster.toString()}`);
                ui.write(`   Safety Deposit: ${details.safetyDeposit.toString()} nanotons`);
                ui.write(`   Timelock: ${details.timelockDuration} seconds`);
                ui.write(`   Created At: ${details.createdAt}`);
                break;

            case 'Check Can Withdraw':
                const checkSecretText = await ui.input('Enter secret:');
                
                // Convert text secret to hex string representing first 4 bytes
                const checkSecretBuffer = Buffer.from(checkSecretText);
                const checkSecretHex = checkSecretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
                
                ui.write(`🔐 Checking with secret: "${checkSecretText}" (hex: 0x${checkSecretHex})`);
                
                const canWithdraw = await sourceEscrow.canWithdraw(provider.provider(contractAddress), checkSecretHex);
                ui.write(`🔍 Can Withdraw: ${canWithdraw}`);
                break;

            case 'Check Can Refund':
                const canRefund = await sourceEscrow.canRefund(provider.provider(contractAddress));
                ui.write(`🔄 Can Refund: ${canRefund}`);
                break;

            case 'Send Lock':
                await sourceEscrow.sendLock(provider.sender(), toNano('0.05'));
                ui.write('✅ Lock message sent!');
                break;

            case 'Send Withdraw':
                const withdrawSecretText = await ui.input('Enter secret:');
                
                // Convert text secret to hex string representing first 4 bytes
                const secretBuffer = Buffer.from(withdrawSecretText);
                const secretHex = secretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
                
                ui.write(`🔐 Using secret: "${withdrawSecretText}" (hex: 0x${secretHex})`);
                
                await sourceEscrow.sendWithdraw(provider.sender(), {
                    value: toNano('0.05'),
                    secret: secretHex,
                });
                ui.write('✅ Withdraw message sent! (Full amount will be withdrawn)');
                break;

            case 'Send Refund':
                await sourceEscrow.sendRefund(provider.sender(), toNano('0.05'));
                ui.write('✅ Refund message sent!');
                break;
        }
    } catch (error) {
        ui.write(`❌ Error: ${error}`);
    }
}

async function interactWithDestinationEscrow(provider: NetworkProvider, contractAddress: Address) {
    const ui = provider.ui();
    const destinationEscrow = provider.open(TonDestinationEscrow.createFromAddress(contractAddress));

    const action = await ui.choose('Choose action:', [
        'Get Escrow Details',
        'Check Can Withdraw',
        'Check Can Refund',
        'Check In Exclusive Period',
        'Send Lock',
        'Send Withdraw',
        'Send Refund',
        'Send Cancel'
    ], (a) => a);

    try {
        switch (action) {
            case 'Get Escrow Details':
                const details = await destinationEscrow.getEscrowDetails();
                ui.write('📊 Escrow Details:');
                ui.write(`   Status: ${details.status}`);
                ui.write(`   Escrow ID: ${details.escrowId.toString()}`);
                ui.write(`   Amount: ${details.amount.toString()} nanotons`);
                ui.write(`   Resolver: ${details.resolverAddress.toString()}`);
                ui.write(`   Maker: ${details.makerAddress.toString()}`);
                ui.write(`   Refund: ${details.refundAddress.toString()}`);
                ui.write(`   Asset Type: ${details.assetType}`);
                ui.write(`   Jetton Master: ${details.jettonMaster.toString()}`);
                ui.write(`   Safety Deposit: ${details.safetyDeposit.toString()} nanotons`);
                ui.write(`   Timelock: ${details.timelockDuration} seconds`);
                ui.write(`   Created At: ${details.createdAt}`);
                ui.write(`   Exclusive Period: ${details.exclusivePeriod} seconds`);
                break;

            case 'Check Can Withdraw':
                const secret = await ui.input('Enter secret (hex):');
                const canWithdraw = await destinationEscrow.canWithdraw(provider.provider(contractAddress), secret);
                ui.write(`🔍 Can Withdraw: ${canWithdraw}`);
                break;

            case 'Check Can Refund':
                const canRefund = await destinationEscrow.canRefund(provider.provider(contractAddress));
                ui.write(`🔄 Can Refund: ${canRefund}`);
                break;

            case 'Check In Exclusive Period':
                const inExclusive = await destinationEscrow.inExclusivePeriod(provider.provider(contractAddress));
                ui.write(`⏰ In Exclusive Period: ${inExclusive}`);
                break;

            case 'Send Lock':
                await destinationEscrow.sendLock(provider.sender(), toNano('0.05'));
                ui.write('✅ Lock message sent!');
                break;

            case 'Send Withdraw':
                const withdrawSecret = await ui.input('Enter secret (hex):');
                
                await destinationEscrow.sendWithdraw(provider.sender(), {
                    value: toNano('0.05'),
                    secret: withdrawSecret,
                });
                ui.write('✅ Withdraw message sent! (Full amount will be withdrawn)');
                break;

            case 'Send Refund':
                await destinationEscrow.sendRefund(provider.sender(), toNano('0.05'));
                ui.write('✅ Refund message sent!');
                break;

            case 'Send Cancel':
                await destinationEscrow.sendCancel(provider.sender(), toNano('0.05'));
                ui.write('✅ Cancel message sent!');
                break;
        }
    } catch (error) {
        ui.write(`❌ Error: ${error}`);
    }
} 