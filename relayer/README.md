# TON Fusion+ Relayer CLI

A command-line relayer for 1inch Fusion+ cross-chain swaps between TON and EVM chains.

## Overview

This is a **relayer** (not a resolver). Based on the [1inch Fusion documentation](https://blog.1inch.io/fusion-mode-swap-resolving-45a9203f95e9/):

- **Relayer**: Monitors blockchain events and notifies resolvers about opportunities
- **Resolver**: Actual market makers who fill orders and deploy escrows

This relayer listens for events on both TON and EVM chains, tracks order lifecycles, and notifies resolvers when action is needed.

## Features

- ✅ **Event Monitoring**: Real-time TON & EVM blockchain monitoring
- ✅ **Order Tracking**: Full lifecycle tracking from creation to completion
- ✅ **Resolver Notifications**: Alerts resolvers about opportunities
- ✅ **CLI Interface**: Easy-to-use command-line tool
- ✅ **Contract Integration**: Direct integration with your TON escrow contracts
- ✅ **Live Updates**: Watch mode with real-time event streaming

## Architecture

```
TON Chain Events ←→ Relayer ←→ EVM Chain Events
                        ↓
                   Event Processing
                        ↓
                Resolver Notifications
                        ↓
                 Order Lifecycle Tracking
```

**Role Separation**:

- **Relayer** (this tool): Listens, tracks, notifies
- **Resolver** (separate entity): Fills orders, deploys escrows, executes swaps

## Quick Start

### 1. Installation

```bash
cd relayer
npm install
```

### 2. Global Installation

```bash
npm run link  # Makes ton-relayer available globally
```

### 3. Configuration

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# TON Configuration
TON_RPC_URL=https://toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_ton_api_key
TON_PRIVATE_KEY="word1 word2 ... word24"  # 24-word mnemonic

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

### 4. Usage

```bash
# Check system status
ton-relayer status

# Start the relayer
ton-relayer start

# Monitor with live updates
ton-relayer start --watch

# Deploy contracts
ton-relayer deploy --network testnet

# Show help
ton-relayer --help
```

## CLI Commands

```bash
# System Management
ton-relayer status              # Check system health
ton-relayer start              # Start relayer service
ton-relayer start --watch      # Start with live monitoring

# Contract Management
ton-relayer deploy --network testnet   # Deploy contracts
ton-relayer config --show             # Show configuration
ton-relayer config --validate         # Validate config

# Order Management
ton-relayer orders --list             # List all orders
ton-relayer orders --status <id>      # Get order details
ton-relayer orders --cleanup          # Clean completed orders

# Monitoring
ton-relayer monitor               # Real-time event monitoring
ton-relayer monitor --filter active   # Filter by status

# Testing
ton-relayer test --contracts     # Test connections
ton-relayer test --orders        # Test order processing
```

## Event Monitoring Flow

### 1. Event Detection

- Monitors TON contracts for escrow events
- Watches EVM chains for Fusion orders
- Tracks transaction states across chains

### 2. Event Processing

- Parses transaction data and operation codes
- Extracts relevant order and escrow information
- Validates event authenticity

### 3. Resolver Notification

- Identifies relevant resolvers for each event
- Sends notifications about new opportunities
- Provides order details and market data

### 4. Lifecycle Tracking

- Maintains order state from creation to completion
- Monitors timeouts and triggers refund alerts
- Logs all events for audit and debugging

### 5. Recovery & Monitoring

- Detects stuck or expired orders
- Alerts about potential issues
- Provides real-time status updates

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
