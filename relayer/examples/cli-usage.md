# TON Fusion+ Relayer CLI Usage Examples

This document shows how to use the TON Fusion+ relayer CLI to monitor cross-chain events and notify resolvers.

## Installation

```bash
cd relayer
npm install
npm run build
npm link  # Makes ton-relayer available globally
```

## Basic Commands

### 1. Check System Status

```bash
ton-relayer status
```

This will show:

- TON/EVM RPC connection status
- Contract deployment status
- Statistics (orders processed, uptime, etc.)

### 2. Start the Relayer Service

```bash
# Basic start
ton-relayer start

# With live monitoring
ton-relayer start --watch

# With verbose logging
ton-relayer start --verbose
```

### 3. Monitor Orders in Real-Time

```bash
# Monitor all orders
ton-relayer monitor

# Filter by status
ton-relayer monitor --filter pending
ton-relayer monitor --filter active
ton-relayer monitor --filter completed
```

### 4. Deploy TON Contracts

```bash
# Deploy to testnet
ton-relayer deploy --network testnet

# Deploy to mainnet (requires confirmation)
ton-relayer deploy --network mainnet
```

### 5. Manage Configuration

```bash
# Show current config
ton-relayer config --show

# Validate configuration
ton-relayer config --validate
```

### 6. Order Management

```bash
# List all orders
ton-relayer orders --list

# Get specific order status
ton-relayer orders --status order_1234567890_abcd

# Clean up completed orders
ton-relayer orders --cleanup
```

### 7. Run Tests

```bash
# Test contract connections
ton-relayer test --contracts

# Test order processing
ton-relayer test --orders

# Run all tests
ton-relayer test --contracts --orders
```

## Real-World Usage Scenarios

### Scenario 1: Development Setup

```bash
# 1. Configure environment
cp env.example .env
# Edit .env with your credentials

# 2. Validate configuration
ton-relayer config --validate

# 3. Deploy contracts to testnet
ton-relayer deploy --network testnet

# 4. Start monitoring
ton-relayer start --watch --verbose
```

### Scenario 2: Production Monitoring

```bash
# 1. Check system health
ton-relayer status

# 2. Start relayer service
ton-relayer start

# 3. Monitor in separate terminal
ton-relayer monitor --filter active
```

### Scenario 3: Maintenance

```bash
# Check for expired orders
ton-relayer orders --list

# Clean up old orders
ton-relayer orders --cleanup

# Test all systems
ton-relayer test --contracts --orders
```

## Environment Configuration

Create a `.env` file with:

```env
# TON Configuration
TON_RPC_URL=https://toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_ton_api_key_here
TON_PRIVATE_KEY="word1 word2 word3 ... word24"  # 24-word mnemonic

# EVM Configuration
EVM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
EVM_PRIVATE_KEY=0x1234...  # Hex private key
EVM_CHAIN_ID=11155111

# 1inch Fusion
FUSION_API_URL=https://api.1inch.dev/fusion
FUSION_API_KEY=your_1inch_dev_portal_api_key

# Contract Addresses (set after deployment)
TON_SOURCE_ESCROW=EQD...
TON_DESTINATION_ESCROW=EQD...
EVM_RESOLVER_CONTRACT=0x...

# Relayer Settings
POLL_INTERVAL=5000
TIMEOUT_BUFFER=300
MIN_SAFETY_DEPOSIT=1000000000

# Logging
LOG_LEVEL=info
```

## What the Relayer Does

The relayer is **NOT** a resolver. It's an event listener that:

1. **Monitors Events**: Watches both TON and EVM chains for:

   - New order creation
   - Escrow deployments
   - Asset locks/unlocks
   - Timeouts and refunds

2. **Notifies Resolvers**: When events occur, notifies registered resolvers about:

   - New swap opportunities
   - Order status changes
   - Timeout warnings
   - Market conditions

3. **Tracks State**: Maintains order lifecycle tracking:
   - Order creation → Escrow deployment → Locking → Execution → Completion
   - Timeout detection and refund coordination
   - Error handling and recovery

## Integration with Your TON Contracts

The relayer integrates directly with your existing contracts:

- **Source Escrow**: `tron/contracts/ton_source_escrow.fc`
- **Destination Escrow**: `tron/contracts/ton_destination_escrow.fc`

It monitors these contracts for:

- `OP_CREATE_ESCROW` (0x1) - New escrow creation
- `OP_WITHDRAW` (0x2) - Asset withdrawal
- `OP_REFUND` (0x3) - Refund execution

## Example Output

When running `ton-relayer start --watch`, you'll see:

```
🚀 TON Fusion+ Relayer
✅ Relayer is running
Press Ctrl+C to stop

🔄 TON Fusion+ Relayer - Live Mode
⏰ Uptime: 120s
📊 Orders: 3 | Escrows: 6
🔗 Resolvers: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 New source escrow created: abc123...
💰 destination escrow withdrawal: def456...
⏰ Order timeout: order_1234567890_abcd
```

This shows the relayer actively monitoring and reporting events as they happen on both chains.
