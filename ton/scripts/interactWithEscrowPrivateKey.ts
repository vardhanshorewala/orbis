import { Address, toNano, beginCell } from '@ton/core';
import { TonSourceEscrow, Opcodes as SourceOpcodes } from '../wrappers/TonSourceEscrow';
import { TonDestinationEscrow, Opcodes as DestOpcodes } from '../wrappers/TonDestinationEscrow';
import { NetworkProvider } from '@ton/blueprint';
import { WalletContractV4, internal } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // Get mnemonic or private key from environment or user input
    let mnemonic: string[];
    const envMnemonic = process.env.WALLET_MNEMONIC;
    
    if (envMnemonic) {
        mnemonic = envMnemonic.split(' ');
        ui.write(`Using mnemonic from environment variable`);
    } else {
        const mnemonicStr = await ui.input('Enter your 24-word mnemonic phrase (separated by spaces):');
        mnemonic = mnemonicStr.split(' ');
    }

    if (mnemonic.length !== 24) {
        throw new Error('Mnemonic must be exactly 24 words');
    }

    // Convert mnemonic to wallet key
    const keyPair = await mnemonicToWalletKey(mnemonic);
    
    // Create wallet contract
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const walletContract = provider.open(wallet);
    
    ui.write(`Wallet address: ${wallet.address.toString()}`);

    // Get contract address from command line argument or ask user
    const contractAddress = args.length > 0 
        ? Address.parse(args[0])
        : Address.parse(await ui.input('Contract address:'));

    // Ask user which type of contract to interact with
    const contractType = await ui.choose('Contract type:', ['Source Escrow', 'Destination Escrow'], (c) => c);

    if (contractType === 'Source Escrow') {
        await interactWithSourceEscrow(provider, contractAddress, keyPair, walletContract);
    } else {
        await interactWithDestinationEscrow(provider, contractAddress, keyPair, walletContract);
    }
}

async function interactWithSourceEscrow(
    provider: NetworkProvider, 
    contractAddress: Address, 
    keyPair: any,
    walletContract: any
) {
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
                ui.write('🔄 Sending lock transaction...');
                const lockBody = beginCell()
                    .storeUint(SourceOpcodes.LOCK_ESCROW, 32)
                    .storeUint(0, 64) // query_id
                    .endCell();
                
                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: await walletContract.getSeqno(),
                    messages: [
                        internal({
                            to: contractAddress,
                            value: toNano('0.05'),
                            body: lockBody
                        })
                    ]
                });
                ui.write('✅ Lock transaction sent!');
                break;

            case 'Send Withdraw':
                const withdrawSecretText = await ui.input('Enter secret:');
                
                // Convert text secret to hex string representing first 4 bytes
                const secretBuffer = Buffer.from(withdrawSecretText);
                const secretHex = secretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
                
                ui.write(`🔐 Using secret: "${withdrawSecretText}" (hex: 0x${secretHex})`);
                ui.write('🔄 Sending withdraw transaction...');
                
                // Create secret reference cell with 32-bit integer for testing
                const secretInt = parseInt(secretHex.replace('0x', ''), 16);
                const secretCell = beginCell()
                    .storeUint(secretInt, 32)
                    .endCell();
                
                const withdrawBody = beginCell()
                    .storeUint(SourceOpcodes.WITHDRAW, 32)
                    .storeUint(0, 64) // query_id
                    .storeRef(secretCell)
                    .endCell();
                
                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: await walletContract.getSeqno(),
                    messages: [
                        internal({
                            to: contractAddress,
                            value: toNano('0.05'),
                            body: withdrawBody
                        })
                    ]
                });
                ui.write('✅ Withdraw transaction sent! (Full amount will be withdrawn)');
                break;

            case 'Send Refund':
                ui.write('🔄 Sending refund transaction...');
                const refundBody = beginCell()
                    .storeUint(SourceOpcodes.REFUND, 32)
                    .storeUint(0, 64) // query_id
                    .endCell();
                
                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: await walletContract.getSeqno(),
                    messages: [
                        internal({
                            to: contractAddress,
                            value: toNano('0.05'),
                            body: refundBody
                        })
                    ]
                });
                ui.write('✅ Refund transaction sent!');
                break;
        }
    } catch (error) {
        ui.write(`❌ Error: ${error}`);
    }
}

async function interactWithDestinationEscrow(
    provider: NetworkProvider, 
    contractAddress: Address, 
    keyPair: any,
    walletContract: any
) {
    const ui = provider.ui();
    const destinationEscrow = provider.open(TonDestinationEscrow.createFromAddress(contractAddress));

    const action = await ui.choose('Choose action:', [
        'Get Escrow Details',
        'Check Can Withdraw',
        'Check Can Refund',
        'Check In Exclusive Period',
        'Send Lock',
        'Send Withdraw',
        'Send Refund'
    ], (a) => a);

    try {
        switch (action) {
            case 'Get Escrow Details':
                const details = await destinationEscrow.getEscrowDetails();
                ui.write('📊 Escrow Details:');
                ui.write(`   Status: ${details.status}`);
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
                const checkSecretText = await ui.input('Enter secret:');
                
                // Convert text secret to hex string representing first 4 bytes
                const checkSecretBuffer = Buffer.from(checkSecretText);
                const checkSecretHex = checkSecretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
                
                ui.write(`🔐 Checking with secret: "${checkSecretText}" (hex: 0x${checkSecretHex})`);
                
                const canWithdraw = await destinationEscrow.canWithdraw(provider.provider(contractAddress), checkSecretHex);
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
                ui.write('🔄 Sending lock transaction...');
                const destLockBody = beginCell()
                    .storeUint(DestOpcodes.LOCK_ESCROW, 32)
                    .storeUint(0, 64) // query_id
                    .endCell();
                
                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: await walletContract.getSeqno(),
                    messages: [
                        internal({
                            to: contractAddress,
                            value: toNano('0.05'),
                            body: destLockBody
                        })
                    ]
                });
                ui.write('✅ Lock transaction sent!');
                break;

            case 'Send Withdraw':
                const withdrawSecretText = await ui.input('Enter secret:');
                
                // Convert text secret to hex string representing first 4 bytes
                const secretBuffer = Buffer.from(withdrawSecretText);
                const secretHex = secretBuffer.slice(0, 4).toString('hex').padEnd(8, '0');
                
                ui.write(`🔐 Using secret: "${withdrawSecretText}" (hex: 0x${secretHex})`);
                ui.write('🔄 Sending withdraw transaction...');
                
                // Create secret reference cell with 32-bit integer for testing
                const destSecretInt = parseInt(secretHex.replace('0x', ''), 16);
                const destSecretCell = beginCell()
                    .storeUint(destSecretInt, 32)
                    .endCell();
                
                const destWithdrawBody = beginCell()
                    .storeUint(DestOpcodes.WITHDRAW, 32)
                    .storeUint(0, 64) // query_id
                    .storeRef(destSecretCell)
                    .endCell();
                
                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: await walletContract.getSeqno(),
                    messages: [
                        internal({
                            to: contractAddress,
                            value: toNano('0.05'),
                            body: destWithdrawBody
                        })
                    ]
                });
                ui.write('✅ Withdraw transaction sent! (Full amount will be sent to maker)');
                break;

            case 'Send Refund':
                ui.write('🔄 Sending refund transaction...');
                const destRefundBody = beginCell()
                    .storeUint(DestOpcodes.REFUND, 32)
                    .storeUint(0, 64) // query_id
                    .endCell();
                
                await walletContract.sendTransfer({
                    secretKey: keyPair.secretKey,
                    seqno: await walletContract.getSeqno(),
                    messages: [
                        internal({
                            to: contractAddress,
                            value: toNano('0.05'),
                            body: destRefundBody
                        })
                    ]
                });
                ui.write('✅ Refund transaction sent!');
                break;
        }
    } catch (error) {
        ui.write(`❌ Error: ${error}`);
    }
} 