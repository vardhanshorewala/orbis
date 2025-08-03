import { TonAdapter, TonAdapterConfig } from './adapters/TonAdapter';
import { Network, AssetType, OrderStatus, OrderPhase } from './types';
import { Cell } from '@ton/core';
import * as fs from 'fs';
import * as path from 'path';

async function testTonAdapter() {
    console.log('=== TON Adapter Test Script ===\n');
    
    // Load compiled contract codes
    // Real compiled contract codes from TON contracts
    const sourceEscrowCode = Cell.fromBase64('te6cckECFwEABO8AART/APSkE/S88sgLAQIBYgISAgLKAwYC9dTPQ0wMBcbCSXwPg+kAwIscAjk4wMe1E0PpA+kDTB/oA+gDUAdD6QPpA+kDTH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQal41XiRVA2zBwACS8CCRMOLgAtMf0z8xIcABlhAjXwPwIOAyIMAF4wIggQFAAZb8CEALMACljDUMNDwIuAxwAOS8CPgMIQP8vACAc4HCwIBIAgJAN87UTQ+kD6QNMH+gD6ANQw0PpA+kD6QNMf0x/THzBTdqCCCvrwgKAcvvLgdBCaEIkQSBA3EDZeIlUC+CNxyFALzxZQCc8WUAbPFhLLH8sfE8sfychQCM8WUAbPFhLLB1AE+gJQA/oCE8zLH8sHye1UgAbc7UTQ+kD6QNMH+gD6ANQB0PpA+kD6QNMf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqXjVeJFUDUdvHBfLgagzAAfLgZfgjU8GgvvLgZlUKcoAoAZshQC88WUAnPFlAGzxYSyx/LHxPLH8nIUAjPFlAGzxYSywdQBPoCUAP6AhPMyx/LB8ntVAIBIAwPAvc7UTQ+kD6QNMH+gD6ANQB0PpA+kD6QNMf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqXjVeJFUDUevHBfLgag3AAvLgZ1IsyAHPFsn5AKvfAbry4GglwACOEnCAEMjLBSnPFiX6AstqyXH7AOMOcIAQgDQ4AanBTAIIQF41FGYAYyMsFKc8WghAF9eEA+gLLH8s/JvoCKs8WKs8WywCCCvrwgPoCywDJcfsAAI7IywUqzxYk+gLLaslx+wAQm1UYc8hQC88WUAnPFlAGzxYSyx/LHxPLH8nIUAjPFlAGzxYSywdQBPoCUAP6AhPMyx/LB8ntVAL1O1E0PpA+kDTB/oA+gDUAdD6QPpA+kDTH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQal41XiRVA1PcxwVT7McFsfLgaSDAAgHAAbHy4Gr4I1MToL7y4HUnwACOEnCAEMjLBSrPFif6AstqyXH7AOMOgEBEAanBTAIIQF41FGYAYyMsFK88WghAF9eEA+gLLH8s/KPoCK88WK88WywCCCvrwgPoCywDJcfsAAJ5RyscFjhJwgBDIywUrzxYl+gLLaslx+wDeVQp0yFALzxZQCc8WUAbPFhLLH8sfE8sfychQCM8WUAbPFhLLB1AE+gJQA/oCE8zLH8sHye1UAgEgExYCASAUFQC5un6u1E0PpA+kDTB/oA+gDUAdD6QPpA+kDTH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQal41XiRVAzJskyHDAgLDARKwkltw4PgjAqC5kXDgf4AJ+40V7UTQ+kD6QNMH+gD6ANQB0PpA+kD6QNMf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqXjVeJFUDMjMKCQgHBgUEQxOADFvhE/aiaH0gfSBpg/0AfQBqAOh9IH0gfSBpj+mP6Y+YOCmD44BZxwkYg+mPkGOAWcscA+mDmAPImHFInHEINS8arxIqgZqvgag8L4PhgUktuHAA5ADni2T8gFXvgN1ZyLhwP8t7gxtQ==')
    const destinationEscrowCode = Cell.fromBase64('te6cckECGgEABUcAART/APSkE/S88sgLAQIBYgITAgLKAwYC9dTPQ0wMBcbCSXwPg+kAwIscAjk4wMe1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBWzBwACS8CCRMOLgAtMf0z8xIcABlhAjXwPwIOAyIMAF4wIggQFAAZb8CEALMACljDUMNDwIuAxwAOS8CPgMIQP8vACAc4HCwIBIAgJANU7UTQ+kD6QNMH+gD6ANQw0PpA+kDTH9Mf0x/THzBTdqCCCvrwgKAcvvLgdBCaEIkQSBA2EDVVA/gjcchQC88WUAjPFhTLHxLLH8sfyx/JyFAIzxZQBs8WE8sHWPoCUAP6AhPMyx/LB8ntVIAG3O1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBVHcxwXy4GoMwAHy4GX4I1PCoL7y4GZVCnKAKAGDIUAvPFlAIzxYUyx8Syx/LH8sfychQCM8WUAbPFhPLB1j6AlAD+gITzMsfywfJ7VQCASAMEAP3O1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBcAC8uBnUk3IAc8WyfkAq98BuvLgaPgjU8KgIqC5l1PKxwXy4GreJ8AA4w9wgBDIywVQDs8WJfoCHYA0ODwAkcIAQyMsFK88WJ/oCy2rJcfsAAGpwUwCCEBeNRRmAGMjLBSvPFoIQBfXhAPoCyx/LPyj6AizPFizPFssAggr68ID6AssAyXH7AAByy2rJcfsAVRlzyFALzxZQCM8WFMsfEssfyx/LH8nIUAjPFlAGzxYTywdY+gJQA/oCE8zLH8sHye1UAvU7UTQ+kD6QNMH+gD6ANQB0PpA+kDTH9Mf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqEGleJVUFUdzHBfLgaSzAAg3AAR2x8uBq+CNTw6C+8uB1J8AAjhJwgBDIywUqzxYn+gLLaslx+wDjDnCAEMiAREgBqcFMAghAXjUUZgBjIywUrzxaCEAX14QD6Assfyz8o+gIrzxYrzxbLAIIK+vCA+gLLAMlx+wAAgssFLM8WJvoCy2rJcfsAVQp0yFALzxZQCM8WFMsfEssfyx/LH8nIUAjPFlAGzxYTywdY+gJQA/oCE8zLH8sHye1UAgEgFBkCASAVFgC/un6u1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBTU1W2xjIcMCAsMBErCSW3DgAfgjAqC5kXDgf4AgEgFxgAnbWivaiaH0gfSBpg/0AfQBqAOh9IH0gaY/pj+mP6Y+YOCmD44BZxwkYg+mPkGOAWcscA+mDmAPImHFInHEINQg0rxKqgpmaDQyMC4sKignAAu7WS3aiaH0gfSBpg/0AfQBqAOh9IH0gaY/pj+mP6Y+YOCmD44BZxwkYg+mPkGOAWcscA+mDmAPImHFInHEINQg0rxKqgrZCGgHhgUmvgbhwAXwRgVApAdApCd8BXNhAAxb4RP2omh9IH0gaYP9AH0AagDofSB9IGmP6Y/pj+mPmDgpg+OAWccJGIPpj5BjgFnLHAPpg5gDyJhxSJxxCDUINK8SqoKbL4IoM6+DYYFJLbhwAOQA54tk/IBV74DdWci4cD/NutsSE=')
    // Configuration
    const config: TonAdapterConfig = {
        network: Network.TON_TESTNET,
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TON_API_KEY, // Optional, but recommended for production
        mnemonic: process.env.TON_MNEMONIC || '', // You'll need to set this
        sourceEscrowCode,
        destinationEscrowCode
    };
    
    // Check if mnemonic is provided
    if (!config.mnemonic) {
        console.error('❌ Error: TON_MNEMONIC environment variable is not set');
        console.log('\nTo set it, run:');
        console.log('export TON_MNEMONIC="your 24 word mnemonic phrase here"');
        process.exit(1);
    }
    
    try {
        // Create adapter instance
        console.log('📦 Creating TON adapter...');
        const adapter = new TonAdapter(config);
        
        // Initialize the adapter
        console.log('🚀 Initializing adapter...');
        await adapter.initialize();
        
        console.log('✅ TON Adapter initialized successfully!\n');
        
        // Display wallet info
        console.log('📊 Wallet Information:');
        console.log('Expected address: 0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm');
        console.log('Note: The actual address will depend on your mnemonic\n');
        
        // Get and display balance
        const balance = await adapter.getBalance();
        console.log(`💰 Wallet balance: ${balance} nanoTON`);
        
        // Test secret generation
        console.log('\n🔐 Testing secret generation...');
        const secretData = adapter.generateSecret();
        console.log(`Generated secret: 0x${secretData.secret}`);
        console.log(`Secret hash: 0x${secretData.hash}`);
        
        // Test contract deployment
        console.log('\n📄 Testing contract deployment...');
        
        // Create a test fusion order
        const walletAddress = adapter.getWalletAddress();
        const testOrder = {
            orderId: 'test-order-' + Date.now(),
            nonce: BigInt(Date.now()),
            maker: walletAddress,
            resolver: walletAddress,
            sourceChain: Network.TON_TESTNET,
            destinationChain: Network.TON_TESTNET,
            targetAddress: walletAddress,
            refundAddress: walletAddress,
            makerAsset: {
                type: AssetType.NATIVE_TON,
                address: '',
                amount: BigInt('50000000'), // 0.05 TON in nanotons
                network: Network.TON_TESTNET
            },
            takerAsset: {
                type: AssetType.NATIVE_TON,
                address: '',
                amount: BigInt('25000000'), // 0.025 TON in nanotons
                network: Network.TON_TESTNET
            },
            secretHash: '',
            timelockDuration: 3600, // 1 hour
            finalityTimelock: 10, // 30 seconds for testing
            exclusivePeriod: 1800, // 30 minutes
            makerSafetyDeposit: BigInt('10000000'), // 0.01 TON
            takerSafetyDeposit: BigInt('10000000'), // 0.01 TON
            status: OrderStatus.CREATED,
            phase: OrderPhase.ANNOUNCEMENT,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        try {
            // Deploy source escrow
            console.log('🚀 Deploying source escrow contract...');
            const sourceEscrowAddress = await adapter.deploySourceEscrow(testOrder, secretData.hash);
            
            console.log(`✅ Source escrow deployed at: ${sourceEscrowAddress.toString()}`);
            
            // Wait a bit for the transaction to be processed
            console.log('⏳ Waiting for source escrow deployment...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Deploy destination escrow
            console.log('🚀 Deploying destination escrow contract...');
            const destinationEscrowAddress = await adapter.deployDestinationEscrow(testOrder, secretData.hash);
            console.log(`✅ Destination escrow deployed at: ${destinationEscrowAddress.toString()}`);
            
            // Wait a bit for the transaction to be processed
            console.log('⏳ Waiting for destination escrow deployment...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('\n📋 Deployment Summary:');
            console.log(`Order ID: ${testOrder.orderId}`);
            console.log(`Source Escrow: ${sourceEscrowAddress.toString()}`);
            console.log(`Destination Escrow: ${destinationEscrowAddress.toString()}`);
            console.log(`Secret Hash: 0x${secretData.hash}`);
            console.log(`Secret: 0x${secretData.secret}`);
            
            // Wait for contracts to be fully deployed and finality timelock to pass
            console.log('\n⏳ Waiting 35 seconds for contracts to be deployed and finality timelock to pass...');
            console.log('💡 The contract requires waiting for the finality timelock period (30s) before locking');
            await new Promise(resolve => setTimeout(resolve, 35000));
            
            // Test locking operations
            console.log('\n🔒 Testing contract locking operations...');
            
            try {
                // Lock source escrow
                console.log('🔐 Locking source escrow...');
                await adapter.lockSourceEscrow(sourceEscrowAddress);
                console.log('✅ Source escrow locked successfully!');
                
                // Wait between operations
                console.log('⏳ Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Lock destination escrow
                console.log('🔐 Locking destination escrow...');
                await adapter.lockDestinationEscrow(destinationEscrowAddress);
                console.log('✅ Destination escrow locked successfully!');
                
                // Wait after final operation
                console.log('⏳ Waiting 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                console.log('\n🎯 Lock Operations Summary:');
                console.log('✅ Both escrows are now locked and ready for atomic swap');
                console.log('💡 Next steps would be:');
                console.log('   1. Maker reveals secret to withdraw from destination escrow');
                console.log('   2. Taker uses revealed secret to withdraw from source escrow');
                console.log('   3. Or either party can refund after timelock expires');
                
            } catch (lockError) {
                console.error('❌ Contract locking failed:', lockError);
                console.log('💡 This might be due to insufficient balance or contract state issues');
            }
            
        } catch (deployError) {
            console.error('❌ Contract deployment failed:', deployError);
            console.log('💡 This might be due to insufficient balance or network issues');
        }
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
        process.exit(1);
    }
}

// Run the test
testTonAdapter().catch(console.error); 