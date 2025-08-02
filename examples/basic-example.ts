/**
 * Basic Usage Example for TON Fusion+ SDK
 * 
 * This example demonstrates how to create TON-side HTLC escrow contracts
 * for cross-chain atomic swaps between EVM chains and TON using 1inch Fusion+.
 * 
 * Scenarios covered:
 * 1. EVM → TON: User locks assets on EVM, receives TON/Jettons
 * 2. TON → EVM: User locks TON/Jettons, receives EVM assets
 */

import { 
  TONFusionEscrowManager, 
  TONEscrowParams, 
  AssetType, 
  PROTOCOL_CONSTANTS,
  TON_NETWORKS,
  utils,
} from '../src/index';
import { TonClient } from '@ton/ton';
import { Address, Cell } from '@ton/core';

async function basicExample(): Promise<void> {
  console.log('🚀 TON Fusion+ SDK Basic Example');
  
  // Initialize TON client
  const tonClient = new TonClient({
    endpoint: TON_NETWORKS.TESTNET.endpoint,
    apiKey: process.env.TON_CENTER_API_KEY, // Optional
  });

  // Mock contract code cells (in production, load actual compiled contracts)
  const sourceEscrowCode = new Cell(); // Would contain actual FunC bytecode
  const destinationEscrowCode = new Cell(); // Would contain actual FunC bytecode

  // Initialize Fusion+ escrow manager
  const escrowManager = new TONFusionEscrowManager(
    tonClient,
    sourceEscrowCode,
    destinationEscrowCode
  );

  // Example addresses (replace with real addresses)
  const makerAddress = Address.parse('0:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  const resolverAddress = Address.parse('0:fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321');
  const targetAddress = Address.parse('0:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');

  console.log('📝 Creating TON escrow parameters for cross-chain swaps...');
  
  // Scenario 1: TON → EVM (TON source escrow locks TON/Jettons)
  const tonSourceEscrowParams: TONEscrowParams = {
    makerAddress,
    resolverAddress,
    targetAddress,
    refundAddress: makerAddress, // Refund to maker if swap fails
    assetType: AssetType.TON,
    jettonMaster: Address.parse('0:' + '0'.repeat(64)), // Not needed for TON native tokens
    amount: utils.toNano('10'), // 10 TON
    safetyDeposit: PROTOCOL_CONSTANTS.MIN_SAFETY_DEPOSIT,
    secretHash: '0x' + '1'.repeat(64), // Would be actual SHA-256 hash
    timelockDuration: PROTOCOL_CONSTANTS.DEFAULT_TIMELOCK_DURATION,
    finalityTimelock: PROTOCOL_CONSTANTS.DEFAULT_FINALITY_TIMELOCK,
    merkleRoot: '0x' + '0'.repeat(64), // For partial fills
  };

  // Scenario 2: EVM → TON (TON destination escrow receives TON/Jettons)
  const tonDestinationEscrowParams: TONEscrowParams & { exclusivePeriod: number } = {
    ...tonSourceEscrowParams,
    targetAddress: makerAddress, // Maker withdraws on destination
    exclusivePeriod: PROTOCOL_CONSTANTS.DEFAULT_EXCLUSIVE_PERIOD,
  };

  console.log('💰 TON Source escrow - Amount:', utils.fromNano(tonSourceEscrowParams.amount), 'TON');
  console.log('⏰ Timelock duration:', utils.formatDuration(tonSourceEscrowParams.timelockDuration));
  console.log('🔒 Safety deposit:', utils.fromNano(tonSourceEscrowParams.safetyDeposit), 'TON');

  try {
    // NOTE: These are placeholder calls - actual implementation would require:
    // 1. Proper wallet/sender with private keys
    // 2. Actual compiled contract code
    // 3. Real addresses and parameters
    
    console.log('🏗️  Creating TON source escrow contract (TON → EVM swap)...');
    const tonSourceEscrow = await escrowManager.createSourceEscrow(
      {} as any, // Would be actual Sender instance
      tonSourceEscrowParams
    );
    console.log('✅ TON source escrow created at:', tonSourceEscrow.contractAddress);

    console.log('🏗️  Creating TON destination escrow contract (EVM → TON swap)...');  
    const tonDestinationEscrow = await escrowManager.createDestinationEscrow(
      {} as any, // Would be actual Sender instance
      tonDestinationEscrowParams
    );
    console.log('✅ TON destination escrow created at:', tonDestinationEscrow.contractAddress);

    // Generate secrets for partial fills demonstration
    console.log('🔐 Generating secrets for partial fills...');
    const { secrets, merkleTree, secretHash } = escrowManager.generateSecretsForPartialFills(4);
    console.log('🌳 Merkle root:', merkleTree.root);
    console.log('🗝️  Generated', secrets.length, 'secrets for partial fills');

    // Simulate partial fill
    const partialFillIndex = 0;
    const merkleProof = escrowManager.getMerkleProofForPartialFill(merkleTree, partialFillIndex);
    console.log('📋 Merkle proof siblings:', merkleProof.siblings.length);

    // Check escrow status
    console.log('🔍 Checking TON source escrow status...');
    const escrowStatus = await escrowManager.getEscrowStatus(tonSourceEscrow.contractAddress);
    console.log('📊 Escrow status:', escrowStatus.status);
    console.log('💵 Escrow amount:', utils.fromNano(escrowStatus.amount), 'TON');

  } catch (error) {
    console.error('❌ Error during example execution:', error);
  }

  console.log('✨ Example completed!');
}

// Run example if called directly
if (require.main === module) {
  basicExample().catch(console.error);
}

export { basicExample }; 