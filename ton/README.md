# TON Smart Contracts

Smart contracts for the Orbis cross-chain bridge, enabling secure token swaps between TON and Ethereum networks using escrow mechanisms.

## 🏗️ Architecture

The bridge uses two main escrow contracts:

- **`TonSourceEscrow`**: Handles TON → ETH swaps (TON side)
- **`TonDestinationEscrow`**: Handles ETH → TON swaps (TON side)

### Flow Overview

#### TON → ETH Swap
1. User sends TON to `TonSourceEscrow`
2. Contract locks TON and emits cross-chain message
3. Relayer processes message on Ethereum
4. User receives ETH on Ethereum

#### ETH → TON Swap
1. User sends ETH to Ethereum escrow contract
2. Ethereum contract emits cross-chain message
3. Relayer calls `TonDestinationEscrow` on TON
4. User receives TON

## 🚀 Tech Stack

- **Language**: FunC (TON's smart contract language)
- **Build Tool**: TON SDK with TypeScript
- **Testing**: Jest with TON testing framework
- **Deployment**: TON CLI and TypeScript scripts

## 📁 Project Structure

```
ton/
├── contracts/               # Smart contracts (FunC)
│   ├── imports/            # Shared utilities and constants
│   │   ├── constants.fc    # Contract constants
│   │   ├── jetton-utils.fc # Jetton handling utilities
│   │   └── stdlib.fc       # Standard library functions
│   ├── ton_source_escrow.fc      # Source escrow contract
│   ├── ton_destination_escrow.fc # Destination escrow contract
│   └── test_contract.fc          # Test contract for development
├── wrappers/               # TypeScript contract wrappers
│   ├── TonSourceEscrow.ts       # Source escrow wrapper
│   ├── TonDestinationEscrow.ts  # Destination escrow wrapper
│   └── TestContract.ts          # Test contract wrapper
├── scripts/                # Deployment and interaction scripts
│   ├── deployTonSourceEscrow.ts
│   ├── deployTonDestinationEscrow.ts
│   └── interactWithEscrow.ts
├── tests/                  # Test suites
│   └── TestContract.spec.ts
└── temp/                   # Temporary build files
```

## 🛠️ Setup & Development

### Prerequisites

- Node.js 18+ and npm
- TON CLI (optional, for advanced operations)

### Installation

```bash
npm install
```

### Available Scripts

```bash
# Development
npm run build        # Compile all contracts
npm test            # Run test suites
npm run clean       # Clean build artifacts

# Deployment (Testnet)
npm run deploy:source      # Deploy source escrow contract
npm run deploy:destination # Deploy destination escrow contract
npm run deploy:test       # Deploy test contract

# Interaction
npm run interact     # Interact with deployed contracts
```

## 📜 Smart Contracts

### TonSourceEscrow

**Purpose**: Handles TON → ETH swaps on the TON side

**Key Functions**:
- `lock_tokens()`: Lock TON tokens for cross-chain swap
- `release_tokens()`: Release tokens back to user (if swap fails)
- `confirm_swap()`: Confirm successful cross-chain swap

**Messages**:
- `op::lock_tokens`: Lock tokens for swap
- `op::release_tokens`: Release locked tokens
- `op::confirm_swap`: Confirm cross-chain swap completion

### TonDestinationEscrow

**Purpose**: Handles ETH → TON swaps on the TON side

**Key Functions**:
- `mint_tokens()`: Mint TON tokens after ETH is locked
- `burn_tokens()`: Burn tokens if swap is cancelled
- `process_cross_chain_message()`: Process messages from Ethereum

**Messages**:
- `op::mint_tokens`: Mint tokens for user
- `op::burn_tokens`: Burn tokens (cancel swap)
- `op::cross_chain_message`: Process cross-chain message

### Shared Constants

```func
;; Operation codes
const op::lock_tokens = 0x1;
const op::release_tokens = 0x2;
const op::confirm_swap = 0x3;
const op::mint_tokens = 0x4;
const op::burn_tokens = 0x5;
const op::cross_chain_message = 0x6;

;; Error codes
const error::insufficient_funds = 100;
const error::unauthorized = 101;
const error::invalid_swap = 102;
const error::swap_expired = 103;
```

## 🧪 Testing

### Running Tests

```bash
npm test
```

### Test Coverage

- Contract deployment and initialization
- Token locking and releasing mechanisms
- Cross-chain message handling
- Error conditions and edge cases
- Gas consumption optimization

### Example Test

```typescript
import { TestContract } from '../wrappers/TestContract';

describe('TonSourceEscrow', () => {
    it('should lock tokens correctly', async () => {
        const contract = await TestContract.fromInit();
        const result = await contract.send({
            op: 'lock_tokens',
            amount: toNano('10'),
            destination: 'ethereum_address'
        });
        expect(result.success).toBe(true);
    });
});
```

## 🚀 Deployment

### Testnet Deployment

1. **Configure environment**
   ```bash
   export TON_NETWORK=testnet
   export DEPLOYER_MNEMONIC="your mnemonic phrase"
   ```

2. **Deploy contracts**
   ```bash
   npm run deploy:source
   npm run deploy:destination
   ```

3. **Verify deployment**
   - Check contract addresses in console output
   - Verify on [TON Testnet Explorer](https://testnet.tonscan.org/)

### Contract Addresses (Testnet)

After deployment, update these addresses in your frontend:

```typescript
// Update in your frontend configuration
const CONTRACT_ADDRESSES = {
  TON_SOURCE_ESCROW: 'EQC...', // From deployment output
  TON_DESTINATION_ESCROW: 'EQD...', // From deployment output
};
```

## 🔐 Security Features

### Access Control
- Owner-only functions for critical operations
- Multi-signature support for admin functions
- Time-locked operations for security

### Escrow Safety
- Funds locked until cross-chain confirmation
- Automatic refund mechanisms for failed swaps
- Slippage protection and timeout handling

### Gas Optimization
- Efficient message handling
- Minimal storage usage
- Optimized computation paths

## 🔧 Configuration

### Network Settings

```typescript
// testnet.config.ts
export const TESTNET_CONFIG = {
  network: 'testnet',
  endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TON_API_KEY,
};
```

### Contract Parameters

```func
;; Configurable parameters
const MIN_SWAP_AMOUNT = 1000000000; ;; 1 TON
const MAX_SWAP_AMOUNT = 1000000000000; ;; 1000 TON
const SWAP_TIMEOUT = 3600; ;; 1 hour
const BRIDGE_FEE = 10000000; ;; 0.01 TON
```

## 🛠️ Development Workflow

### 1. Write Contract
```bash
# Edit contracts in contracts/ directory
vim contracts/ton_source_escrow.fc
```

### 2. Create Wrapper
```bash
# Generate TypeScript wrapper
npm run build
```

### 3. Write Tests
```bash
# Add tests in tests/ directory
vim tests/TonSourceEscrow.spec.ts
```

### 4. Test & Deploy
```bash
npm test
npm run deploy:source
```

## 📚 Resources

### TON Development
- [TON Documentation](https://docs.ton.org/)
- [FunC Documentation](https://docs.ton.org/develop/func/overview)
- [TON SDK](https://github.com/ton-org/ton)

### Smart Contract Examples
- [TON Smart Contract Examples](https://github.com/ton-org/ton/tree/master/examples)
- [Jetton Implementation](https://github.com/ton-org/token-contract)

### Tools
- [TON Explorer](https://tonscan.org/)
- [TON Testnet Explorer](https://testnet.tonscan.org/)
- [TON Wallet](https://wallet.ton.org/)

## 🐛 Troubleshooting

### Common Issues

1. **Compilation Errors**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build
   ```

2. **Deployment Failures**
   - Check network connection
   - Verify mnemonic phrase
   - Ensure sufficient TON balance

3. **Test Failures**
   - Update test network configuration
   - Check contract addresses
   - Verify test data validity

### Debug Mode

```bash
# Enable debug logging
DEBUG=ton:* npm test
```

## 🔄 Cross-Chain Integration

### Message Format

```typescript
interface CrossChainMessage {
  operation: 'lock' | 'mint' | 'release' | 'burn';
  amount: bigint;
  recipient: string;
  nonce: number;
  timestamp: number;
}
```

### Relayer Integration

The contracts are designed to work with cross-chain relayers that:
1. Monitor events on both chains
2. Verify cross-chain messages
3. Execute corresponding operations
4. Handle failure scenarios

---

**⚠️ Testnet Only**: These contracts are configured for testnet deployment. Audit and additional testing required before mainnet use.
