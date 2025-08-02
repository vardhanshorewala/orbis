# TON Fusion+ SDK

A TypeScript SDK for integrating 1inch Fusion+ protocol with TON blockchain, enabling intent-based atomic cross-chain swaps between **EVM chains ↔ TON** with professional resolvers.

## 🚀 Features

- **Cross-Chain HTLC**: Atomic swaps between EVM chains (Ethereum, Polygon, etc.) and TON
- **TON Escrow Contracts**: Source and destination escrow contracts written in FunC for TON-side operations
- **EVM Integration**: Works with existing deployed EVM escrow contracts (provided separately)
- **Intent-Based Swaps**: Compatible with 1inch Fusion+ architecture  
- **Professional Resolvers**: Support for KYC'd market makers and MEV protection
- **Partial Fills**: Merkle tree-based partial order execution
- **Dutch Auctions**: Competitive pricing mechanism
- **TypeScript SDK**: Type-safe integration with existing 1inch workflows

## 📦 Installation

```bash
npm install ton-fusion-plus
```

## 🏗️ Project Structure

```
ton-fusion-plus/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Main SDK exports
│   └── ton-escrow-sdk.ts        # TON-side escrow functionality for cross-chain swaps
├── contracts/                    # TON FunC smart contracts
│   ├── ton_source_escrow.fc     # TON source HTLC (TON → EVM swaps)
│   └── ton_destination_escrow.fc # TON destination HTLC (EVM → TON swaps)
├── examples/                     # Usage examples
│   └── basic-example.ts         # Cross-chain swap examples
├── tests/                       # Test files
│   └── setup.ts                # Jest configuration
└── 1inch-fusion-plus-ton-implementation.md # Detailed technical guide
```

**Note:** EVM-side escrow contracts are deployed separately and will be provided by the 1inch team.

## 🔧 Quick Start

### 1. Basic Setup

```typescript
import { 
  TONFusionEscrowManager, 
  TONEscrowParams, 
  AssetType,
  TON_NETWORKS 
} from 'ton-fusion-plus';
import { TonClient } from '@ton/ton';
import { Address, Cell } from '@ton/core';

// Initialize TON client
const tonClient = new TonClient({
  endpoint: TON_NETWORKS.TESTNET.endpoint,
});

// Load compiled contract code (implement contract compilation)
const sourceEscrowCode = await loadContractCode('ton_source_escrow.fc');
const destinationEscrowCode = await loadContractCode('ton_destination_escrow.fc');

// Create escrow manager
const escrowManager = new TONFusionEscrowManager(
  tonClient,
  sourceEscrowCode,
  destinationEscrowCode
);
```

### 2. Create Escrow Parameters

```typescript
const escrowParams: TONEscrowParams = {
  makerAddress: Address.parse('0:...'),
  resolverAddress: Address.parse('0:...'),
  targetAddress: Address.parse('0:...'),
  refundAddress: Address.parse('0:...'),
  assetType: AssetType.TON,
  jettonMaster: '', // For TON native transfers
  amount: utils.toNano('10'), // 10 TON
  safetyDeposit: utils.toNano('0.1'),
  secretHash: '0x1234...', // SHA-256 hash
  timelockDuration: 3600, // 1 hour
  finalityTimelock: 600,  // 10 minutes
  merkleRoot: '0x0000...', // For partial fills
};
```

### 3. Deploy Escrow Contracts

```typescript
// Create source escrow (locks maker's assets)
const sourceEscrow = await escrowManager.createSourceEscrow(
  sender, // Wallet sender instance
  escrowParams
);

// Create destination escrow (receives incoming assets)
const destinationEscrow = await escrowManager.createDestinationEscrow(
  sender,
  { ...escrowParams, exclusivePeriod: 1800 } // 30 min resolver exclusivity
);
```

### 4. Execute Swap

```typescript
// Resolver executes the swap
await escrowManager.executeSwap(
  resolverSender,
  sourceEscrow.contractAddress,
  destinationEscrow.contractAddress,
  secret, // Preimage that hashes to secretHash
  withdrawAmount // Optional: for partial fills
);
```

## 🏛️ Smart Contract Architecture

### Cross-Chain Swap Scenarios

**Scenario 1: EVM → TON**
- **Source**: EVM escrow contract (provided separately) locks EVM assets
- **Destination**: `ton_destination_escrow.fc` receives TON/Jettons

**Scenario 2: TON → EVM** 
- **Source**: `ton_source_escrow.fc` locks TON/Jettons
- **Destination**: EVM escrow contract (provided separately) receives EVM assets

### TON Source Escrow Contract (`ton_source_escrow.fc`)

Used when TON is the source chain, locks maker's TON/Jetton assets:
- **Hashlock**: SHA-256 commitment scheme
- **Timelock**: Refund protection after expiration
- **Partial Fills**: Merkle proof-based withdrawals
- **Safety Deposits**: Resolver collateral mechanism

### TON Destination Escrow Contract (`ton_destination_escrow.fc`)

Used when TON is the destination chain, receives TON/Jetton assets:
- **Exclusive Period**: Resolver-only withdrawal window
- **Emergency Cancel**: Pre-lock cancellation by resolver
- **Cross-Chain Sync**: Coordinated with EVM source escrow

## 🔐 Security Features

- **Atomic Guarantees**: Either both sides complete or both revert
- **MEV Protection**: Professional resolver execution
- **Timelock Safety**: Automatic refunds prevent fund loss
- **Merkle Proofs**: Cryptographic partial fill verification
- **Safety Deposits**: Economic security for resolvers

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run build:watch

# Lint code
npm run lint

# Format code
npm run format

# Compile FunC contracts (requires TON toolchain)
npm run compile-contracts
```

## 📋 Scripts

- `build` - Compile TypeScript to JavaScript
- `dev` - Run development server with ts-node
- `test` - Run Jest test suite
- `lint` - Check code with ESLint
- `format` - Format code with Prettier
- `clean` - Remove build artifacts

## 🌐 Network Configuration

### Testnet
```typescript
{
  name: 'testnet',
  endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  explorer: 'https://testnet.tonscan.org',
}
```

### Mainnet
```typescript
{
  name: 'mainnet',
  endpoint: 'https://toncenter.com/api/v2/jsonRPC', 
  explorer: 'https://tonscan.org',
}
```

## 📚 Documentation

- [Implementation Guide](./1inch-fusion-plus-ton-implementation.md) - Comprehensive technical documentation
- [FunC Contracts](./contracts/) - Smart contract source code
- [Examples](./examples/) - Usage examples and demos
- [1inch Fusion+ Whitepaper](https://1inch.io/assets/1inch-fusion-plus.pdf) - Protocol specification

## 🤝 Integration with 1inch SDK

This SDK is designed to extend the existing 1inch Fusion SDK:

```typescript
// Extend 1inch resolver with TON support
class TONFusionResolver extends BaseFusionResolver {
  private tonEscrowManager: TONFusionEscrowManager;
  
  async executeOrder(order: FusionOrder): Promise<void> {
    if (order.targetChain === 'ton') {
      // Use TON escrow manager for execution
      await this.tonEscrowManager.executeSwap(/*...*/);
    } else {
      // Use existing EVM logic
      await super.executeOrder(order);
    }
  }
}
```

## ⚠️ Status

**Alpha Version** - This SDK is in active development. APIs may change before stable release.

- ✅ Smart contract architecture designed
- ✅ TypeScript interfaces defined  
- ✅ Basic SDK structure implemented
- 🔄 Contract compilation and deployment
- 🔄 Complete testing suite
- 🔄 Production hardening

## 🔗 Related Projects

- [1inch Fusion+](https://github.com/1inch/fusion-plus) - Original EVM implementation
- [TON Blockchain](https://github.com/ton-blockchain) - TON core development
- [Blueprint](https://github.com/ton-org/blueprint) - TON smart contract framework

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- 1inch Network for the Fusion+ protocol design
- TON Foundation for blockchain infrastructure
- TON developer community for tooling and support

---

**Built with ❤️ for the decentralized future** 