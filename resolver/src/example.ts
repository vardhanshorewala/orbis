import { OrbisRelayerServer } from './server';
import { Network, AssetType } from './typeston';

// Real compiled contract codes from the end-to-end test
const sourceEscrowCode = 'te6cckECFwEABO8AART/APSkE/S88sgLAQIBYgISAgLKAwYC9dTPQ0wMBcbCSXwPg+kAwIscAjk4wMe1E0PpA+kDTB/oA+gDUAdD6QPpA+kDTH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQal41XiRVA2zBwACS8CCRMOLgAtMf0z8xIcABlhAjXwPwIOAyIMAF4wIggQFAAZb8CEALMACljDUMNDwIuAxwAOS8CPgMIQP8vACAc4HCwIBIAgJAN87UTQ+kD6QNMH+gD6ANQw0PpA+kD6QNMf0x/THzBTdqCCCvrwgKAcvvLgdBCaEIkQSBA3EDZeIlUC+CNxyFALzxZQCc8WUAbPFhLLH8sfE8sfychQCM8WUAbPFhLLB1AE+gJQA/oCE8zLH8sHye1UgAbc7UTQ+kD6QNMH+gD6ANQB0PpA+kD6QNMf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqXjVeJFUDUdvHBfLgagzAAfLgZfgjU8GgvvLgZlUKcoAoAZshQC88WUAnPFlAGzxYSyx/LHxPLH8nIUAjPFlAGzxYSywdQBPoCUAP6AhPMyx/LB8ntVAIBIAwPAvc7UTQ+kD6QNMH+gD6ANQB0PpA+kD6QNMf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqXjVeJFUDUevHBfLgag3AAvLgZ1IsyAHPFsn5AKvfAbry4GglwACOEnCAEMjLBSnPFiX6AstqyXH7AOMOcIAQgDQ4AanBTAIIQF41FGYAYyMsFKc8WghAF9eEA+gLLH8s/JvoCKs8WKs8WywCCCvrwgPoCywDJcfsAAI7IywUqzxYk+gLLaslx+wAQm1UYc8hQC88WUAnPFlAGzxYSyx/LHxPLH8nIUAjPFlAGzxYSywdQBPoCUAP6AhPMyx/LB8ntVAL1O1E0PpA+kDTB/oA+gDUAdD6QPpA+kDTH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQal41XiRVA1PcxwVT7McFsfLgaSDAAgHAAbHy4Gr4I1MToL7y4HUnwACOEnCAEMjLBSrPFif6AstqyXH7AOMOgEBEAanBTAIIQF41FGYAYyMsFK88WghAF9eEA+gLLH8s/KPoCK88WK88WywCCCvrwgPoCywDJcfsAAJ5RyscFjhJwgBDIywUrzxYl+gLLaslx+wDeVQp0yFALzxZQCc8WUAbPFhLLH8sfE8sfychQCM8WUAbPFhLLB1AE+gJQA/oCE8zLH8sHye1UAgEgExYCASAUFQC5un6u1E0PpA+kDTB/oA+gDUAdD6QPpA+kDTH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQal41XiRVAzJskyHDAgLDARKwkltw4PgjAqC5kXDgf4AJ+40V7UTQ+kD6QNMH+gD6ANQB0PpA+kD6QNMf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqXjVeJFUDMjMKCQgHBgUEQxOADFvhE/aiaH0gfSBpg/0AfQBqAOh9IH0gfSBpj+mP6Y+YOCmD44BZxwkYg+mPkGOAWcscA+mDmAPImHFInHEINS8arxIqgZqvgag8L4PhgUktuHAA5ADni2T8gFXvgN1ZyLhwP8t7gxtQ==';

const destinationEscrowCode = 'te6cckECGgEABUcAART/APSkE/S88sgLAQIBYgITAgLKAwYC9dTPQ0wMBcbCSXwPg+kAwIscAjk4wMe1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBWzBwACS8CCRMOLgAtMf0z8xIcABlhAjXwPwIOAyIMAF4wIggQFAAZb8CEALMACljDUMNDwIuAxwAOS8CPgMIQP8vACAc4HCwIBIAgJANU7UTQ+kD6QNMH+gD6ANQw0PpA+kDTH9Mf0x/THzBTdqCCCvrwgKAcvvLgdBCaEIkQSBA2EDVVA/gjcchQC88WUAjPFhTLHxLLH8sfyx/JyFAIzxZQBs8WE8sHWPoCUAP6AhPMyx/LB8ntVIAG3O1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBVHcxwXy4GoMwAHy4GX4I1PCoL7y4GZVCnKAKAGDIUAvPFlAIzxYUyx8Syx/LH8sfychQCM8WUAbPFhPLB1j6AlAD+gITzMsfywfJ7VQCASAMEAP3O1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBcAC8uBnUk3IAc8WyfkAq98BuvLgaPgjU8KgIqC5l1PKxwXy4GreJ8AA4w9wgBDIywVQDs8WJfoCHYA0ODwAkcIAQyMsFK88WJ/oCy2rJcfsAAGpwUwCCEBeNRRmAGMjLBSvPFoIQBfXhAPoCyx/LPyj6AizPFizPFssAggr68ID6AssAyXH7AAByy2rJcfsAVRlzyFALzxZQCM8WFMsfEssfyx/LH8nIUAjPFlAGzxYTywdY+gJQA/oCE8zLH8sHye1UAvU7UTQ+kD6QNMH+gD6ANQB0PpA+kDTH9Mf0x/THzBwUwfHALOOEjEH0x8gxwCzljgH0wcwB5Ew4pE44hBqEGleJVUFUdzHBfLgaSzAAg3AAR2x8uBq+CNTw6C+8uB1J8AAjhJwgBDIywUqzxYn+gLLaslx+wDjDnCAEMiAREgBqcFMAghAXjUUZgBjIywUrzxaCEAX14QD6Assfyz8o+gIrzxYrzxbLAIIK+vCA+gLLAMlx+wAAgssFLM8WJvoCy2rJcfsAVQp0yFALzxZQCM8WFMsfEssfyx/LH8nIUAjPFlAGzxYTywdY+gJQA/oCE8zLH8sHye1UAgEgFBkCASAVFgC/un6u1E0PpA+kDTB/oA+gDUAdD6QPpA0x/TH9Mf0x8wcFMHxwCzjhIxB9MfIMcAs5Y4B9MHMAeRMOKROOIQahBpXiVVBTU1W2xjIcMCAsMBErCSW3DgAfgjAqC5kXDgf4AgEgFxgAnbWivaiaH0gfSBpg/0AfQBqAOh9IH0gaY/pj+mP6Y+YOCmD44BZxwkYg+mPkGOAWcscA+mDmAPImHFInHEINQg0rxKqgpmaDQyMC4sKignAAu7WS3aiaH0gfSBpg/0AfQBqAOh9IH0gaY/pj+mP6Y+YOCmD44BZxwkYg+mPkGOAWcscA+mDmAPImHFInHEINQg0rxKqgrZCGgHhgUmvgbhwAXwRgVApAdApCd8BXNhAAxb4RP2omh9IH0gaYP9AH0AagDofSB9IGmP6Y/pj+mPmDgpg+OAWccJGIPpj5BjgFnLHAPpg5gDyJhxSJxxCDUINK8SqoKbL4IoM6+DYYFJLbhwAOQA54tk/IBV74DdWci4cD/NutsSE=';

// Test mnemonic (24 words) - for testing only, don't use in production
const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';

// Example configuration with real contract codes
const relayerConfig = {
    // Network configurations
    tonNetwork: Network.TON_TESTNET,
    evmNetwork: Network.ETHEREUM_SEPOLIA,
    
    // TON configuration
    tonEndpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    tonApiKey: process.env.TON_API_KEY, // Optional
    tonMnemonic: process.env.TON_MNEMONIC || testMnemonic, // Use env var or test mnemonic
    
    // Real contract codes (base64 encoded)
    tonSourceEscrowCode: sourceEscrowCode,
    tonDestinationEscrowCode: destinationEscrowCode,
    
    // Gas limits
    gasLimits: {
        tonDeploy: BigInt('100000000'), // 0.1 TON
        tonLock: BigInt('50000000'),    // 0.05 TON
        tonWithdraw: BigInt('50000000'), // 0.05 TON
        tonRefund: BigInt('50000000')   // 0.05 TON
    },
    
    // Timing configurations (in seconds)
    defaultTimelockDuration: 3600,     // 1 hour
    defaultFinalityTimelock: 10,     // 30 minutes
    defaultExclusivePeriod: 3600,      // 1 hour
    
    // Safety settings
    minSafetyDeposit: BigInt('10000000'), // 0.01 TON
    maxOrderAmount: BigInt('1000000000000') // 1000 TON
};

const serverConfig = {
    port: 3002,
};

// Start the server
async function startServer() {
    const relayer = new OrbisRelayerServer(relayerConfig, serverConfig);
    
    try {
        console.log('🚀 Starting Orbis Relayer Server...');
        await relayer.start();
        console.log('✅ Relayer server started successfully!');
        
        // Show example API usage
        console.log('\n📋 API Endpoints:');
        console.log(`GET  http://localhost:${serverConfig.port}/health`);
        console.log(`POST http://localhost:${serverConfig.port}/process-order`);
        
        console.log('\n📝 Example curl command to test:');
        console.log(`curl -X GET http://localhost:${serverConfig.port}/health`);
        
        console.log('\n📋 Example order processing request:');
        console.log(`curl -X POST http://localhost:${serverConfig.port}/process-order \\`);
        console.log(`  -H "Content-Type: application/json" \\`);
        console.log(`  -d '{`);
        console.log(`    "maker": "0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm",`);
        console.log(`    "taker": "0x123...",`);
        console.log(`    "makerAsset": {`);
        console.log(`      "type": ${AssetType.NATIVE_TON},`);
        console.log(`      "address": "TON",`);
        console.log(`      "amount": "1000000000",`);
        console.log(`      "network": "${Network.TON_TESTNET}"`);
        console.log(`    },`);
        console.log(`    "takerAsset": {`);
        console.log(`      "type": ${AssetType.NATIVE_ETH},`);
        console.log(`      "address": "ETH",`);
        console.log(`      "amount": "1000000000000000000",`);
        console.log(`      "network": "${Network.ETHEREUM_SEPOLIA}"`);
        console.log(`    },`);
        console.log(`    "sourceChain": "${Network.TON_TESTNET}",`);
        console.log(`    "destinationChain": "${Network.ETHEREUM_SEPOLIA}",`);
        console.log(`    "refundAddress": "0QAhSTtPS0xn3tk-JgMTnVccsoRM94KLnM-Z59FJLPhOm-tm",`);
        console.log(`    "targetAddress": "0x456...",`);
        console.log(`    "timelockDuration": 3600,`);
        console.log(`    "finalityTimelock": 1800`);
        console.log(`  }'`);
        
        console.log('\n💡 Note: Using test mnemonic. Set TON_MNEMONIC env var for production use.');
        console.log('💡 Server will stay running until you press Ctrl+C');
        
    } catch (error) {
        console.error('❌ Failed to start relayer server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down relayer server...');
    process.exit(0);
});

// Start if this file is run directly
if (require.main === module) {
    startServer();
}

export { startServer }; 