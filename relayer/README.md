# TON Fusion+ Relayer

A simple relayer service for 1inch Fusion+ cross-chain swaps between TON and EVM chains.

## Overview

This relayer acts as a bridge between TON and EVM chains, coordinating cross-chain swaps using hashlock/timelock contracts (HTLC). It monitors for swap orders, deploys escrow contracts, and manages the atomic swap process.

## Features

- ✅ **Cross-chain coordination**: TON ↔ EVM swaps
- ✅ **Hashlock/Timelock security**: HTLC implementation
- ✅ **Bidirectional swaps**: Support for both directions
- ✅ **Automatic refunds**: Timeout handling and recovery
- ✅ **Simple architecture**: Minimal dependencies
- ✅ **Real-time monitoring**: Order and escrow tracking

## Architecture

```
User (Maker) → Order Creation → Relayer → Escrow Deployment
                                  ↓
                           Secret Management
                                  ↓
                           Swap Execution → Completion
```

## Quick Start

### 1. Installation

```bash
cd relayer
npm install
```

### 2. Configuration

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# TON Configuration
TON_RPC_URL=https://toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_ton_api_key
TON_PRIVATE_KEY=your_ton_private_key_hex

# EVM Configuration
EVM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
EVM_PRIVATE_KEY=your_evm_private_key_hex
EVM_CHAIN_ID=11155111

# 1inch Fusion
FUSION_API_URL=https://api.1inch.dev/fusion
FUSION_API_KEY=your_1inch_api_key

# Contract Addresses (deploy first)
TON_SOURCE_ESCROW=EQD...
TON_DESTINATION_ESCROW=EQD...
EVM_RESOLVER_CONTRACT=0x...
```

### 3. Build and Run

```bash
# Build
npm run build

# Run in development
npm run dev

# Run in production
npm start
```

## Usage Example

```typescript
import { TonFusionRelayer } from "./src/relayer";
import { config } from "./src/config";

const relayer = new TonFusionRelayer(config);
await relayer.start();

// Create a cross-chain order
const order = await relayer.createOrder({
  sourceChain: "ton",
  destinationChain: "evm",
  fromToken: "TON",
  toToken: "0xA0b86a33E6C100C10E8BD25E70e633c6E1976E08", // USDC
  amount: "1000000000", // 1 TON
  maker: "EQD...", // User's TON address
});

console.log("Order created:", order.orderId);
```

## Swap Flow

### 1. Order Creation

- User creates swap intent
- Relayer generates secret hash
- Order stored with timelock

### 2. Escrow Deployment

- Source escrow: Locks user tokens
- Destination escrow: Resolver deposits target tokens
- Both use same secret hash, different timelocks

### 3. Locking Phase

- User locks tokens in source escrow
- Resolver locks tokens in destination escrow
- Both escrows must be locked to proceed

### 4. Execution Phase

- Resolver reveals secret on destination (claims user tokens)
- User uses revealed secret on source (claims target tokens)
- Atomic swap completed

### 5. Recovery Phase

- If timeout: automatic refunds
- If error: emergency cancellation
- Safety deposits protect against failure

## Security

### Hashlock/Timelock (HTLC)

- **Hashlock**: Same secret required on both chains
- **Timelock**: Different timeouts (source > destination)
- **Atomic**: Either both succeed or both refund

### Timelock Configuration

- **Source chain**: 1 hour timeout
- **Destination chain**: 30 minutes timeout
- **Buffer**: 5 minutes for processing

### Error Handling

- Network failures: Automatic retry
- Timeout detection: Immediate refund
- Invalid secrets: Transaction rejection
- Insufficient funds: Order cancellation

## Contract Integration

### TON Contracts

- **Source Escrow**: `ton_source_escrow.fc`
- **Destination Escrow**: `ton_destination_escrow.fc`
- Methods: `create_escrow`, `withdraw`, `refund`

### EVM Integration

- **1inch Fusion SDK**: Order management
- **Limit Order Protocol**: EVM-side execution
- **Resolver contracts**: Cross-chain coordination

## Development

### Testing

```bash
npm test
```

### Debugging

Set `LOG_LEVEL=debug` in your `.env` file for verbose logging.

### Adding New Chains

1. Add chain configuration to `types.ts`
2. Implement client in `relayer.ts`
3. Add escrow deployment methods
4. Update monitoring loops

## Deployment

### Prerequisites

- TON testnet/mainnet access
- EVM testnet/mainnet RPC
- 1inch Fusion API access
- Deployed escrow contracts

### Production Setup

1. Deploy contracts on target networks
2. Configure environment variables
3. Set up monitoring and alerts
4. Start relayer service

### Monitoring

- Order processing status
- Escrow contract states
- Timeout detection
- Error rates and recovery

## Limitations

This is a **minimal viable implementation** for demonstration:

- Single relayer instance (no clustering)
- Simplified error handling
- Basic monitoring
- File-based configuration
- Mock contract interactions

For production use, consider:

- Redundant relayer setup
- Database persistence
- Advanced monitoring
- Formal verification
- Security audits

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## License

MIT License - see LICENSE file for details.
