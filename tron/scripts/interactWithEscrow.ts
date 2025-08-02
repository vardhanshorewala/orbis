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
                ui.write(`   Timelock: ${details.timelockDuration} seconds`);
                break;

            case 'Check Can Withdraw':
                const secret = await ui.input('Enter secret (hex):');
                const canWithdraw = await sourceEscrow.canWithdraw(provider.provider(contractAddress), secret);
                ui.write(`🔍 Can Withdraw: ${canWithdraw}`);
                break;

            case 'Check Can Refund':
                const canRefund = await sourceEscrow.canRefund(provider.provider(contractAddress));
                ui.write(`🔄 Can Refund: ${canRefund}`);
                break;

            case 'Send Withdraw':
                const withdrawSecret = await ui.input('Enter secret (hex):');
                const withdrawAmount = await ui.input('Enter withdraw amount (in TON, leave empty for full):');
                
                await sourceEscrow.sendWithdraw(provider.sender(), {
                    value: toNano('0.05'),
                    secret: withdrawSecret,
                    withdrawAmount: withdrawAmount ? toNano(withdrawAmount) : undefined,
                });
                ui.write('✅ Withdraw message sent!');
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
                const details = await destinationEscrow.getEscrowDetails(provider.provider(contractAddress));
                ui.write('📊 Escrow Details:');
                ui.write(`   Status: ${details.status}`);
                ui.write(`   Amount: ${details.amount.toString()} nanotons`);
                ui.write(`   Resolver: ${details.resolverAddress.toString()}`);
                ui.write(`   Maker: ${details.makerAddress.toString()}`);
                ui.write(`   Refund: ${details.refundAddress.toString()}`);
                ui.write(`   Timelock: ${details.timelockDuration} seconds`);
                ui.write(`   Exclusive Period: ${details.exclusivePeriod} seconds`);
                break;

            case 'Check Can Withdraw':
                const secret = await ui.input('Enter secret (hex):');
                const canWithdraw = await destinationEscrow.canWithdraw(
                    provider.provider(contractAddress),
                    secret
                );
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
                await destinationEscrow.sendLock(provider.provider(contractAddress), provider.sender(), toNano('0.05'));
                ui.write('✅ Lock message sent!');
                break;

            case 'Send Withdraw':
                const withdrawSecret = await ui.input('Enter secret (hex):');
                const withdrawAmount = await ui.input('Enter withdraw amount (in TON, leave empty for full):');
                
                await destinationEscrow.sendWithdraw(provider.provider(contractAddress), provider.sender(), {
                    value: toNano('0.05'),
                    secret: withdrawSecret,
                    withdrawAmount: withdrawAmount ? toNano(withdrawAmount) : undefined,
                });
                ui.write('✅ Withdraw message sent!');
                break;

            case 'Send Refund':
                await destinationEscrow.sendRefund(provider.provider(contractAddress), provider.sender(), toNano('0.05'));
                ui.write('✅ Refund message sent!');
                break;

            case 'Send Cancel':
                await destinationEscrow.sendCancel(provider.provider(contractAddress), provider.sender(), toNano('0.05'));
                ui.write('✅ Cancel message sent!');
                break;
        }
    } catch (error) {
        ui.write(`❌ Error: ${error}`);
    }
} 