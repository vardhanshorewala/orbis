# TON Fusion+ Resolver

A simple resolver implementation for the 1inch Fusion+ protocol extension to TON blockchain. This resolver handles cross-chain atomic swaps between TON and EVM chains.

## Overview

The resolver is a market maker that:

1. Receives order notifications from the relayer
2. Deploys escrow contracts on both source and destination chains
3. Executes atomic swaps using hashlocks and timelocks
4. Handles refunds if swaps fail or timeout

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Relayer   │────▶│   Resolver  │────▶│   Escrows   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────▼────┐   ┌───▼────┐
               │   TON   │   │  EVM   │
               │ Adapter │   │Adapter │
               └─────────┘   └────────┘
```

## Components

### Adapters

- **TonAdapter**: Handles TON blockchain operations (escrow deployment, fund locking, secret revealing)
- **EvmAdapter**: Handles EVM blockchain operations (using deployed EscrowFactory)

### Core Resolver

- Processes orders from the relayer
- Manages swap execution lifecycle
- Handles timeouts and refunds

## Installation

```bash
npm install
```

## Configuration

Copy `env.example` to `.env` and configure:

```bash
# TON Configuration
TON_RPC_URL=https://testnet.toncenter.com/api/v2/jsonRPC
TON_API_KEY=your_ton_api_key
TON_MNEMONIC="your twelve word mnemonic phrase"

# EVM Configuration
EVM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
EVM_PRIVATE_KEY=0xyour_private_key
EVM_CHAIN_ID=11155111
EVM_ESCROW_FACTORY=0x_deployed_factory_address

# Fusion Configuration
FUSION_API_URL=https://api.1inch.dev/fusion
FUSION_API_KEY=your_api_key

# Resolver Settings
MIN_PROFIT_THRESHOLD=1000000
MAX_GAS_PRICE=50000000000
TIMEOUT_SECONDS=300
```

## Usage

### Start Resolver

```bash
npm run dev -- start
```

### Check Status

```bash
npm run dev -- status
```

### Run Demo Swap

```bash
npm run dev -- demo
```

### Process Order from Relayer

```bash
npm run dev -- handle-order '<order_json>'
```

### Manual Order Processing

```bash
npm run dev -- process-order \
  --order-id "order_123" \
  --maker "EQD0vdSA..." \
  --source-chain ton \
  --dest-chain evm \
  --from-token TON \
  --to-token USDC \
  --amount 1000000000
```

## Swap Flow

1. **Order Reception**: Relayer notifies resolver about new order
2. **Profitability Check**: Resolver evaluates if order is profitable
3. **Secret Generation**: Create secret and hash for atomic swap
4. **Escrow Deployment**:
   - Deploy source escrow with maker's assets
   - Deploy destination escrow with resolver's assets
5. **Fund Locking**: Lock funds in both escrows
6. **Secret Reveal**: Reveal secret to claim funds
7. **Completion**: Both parties receive their assets

## Error Handling

- **Timeout Management**: Automatic refunds after timelock expiry
- **Failed Transactions**: Retry logic with exponential backoff
- **Balance Monitoring**: Ensures sufficient funds before operations

## Development

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Running Tests

```bash
npm test  # TODO: Add tests
```

## Integration with Relayer

The relayer triggers the resolver by:

1. CLI execution: `npm run dev -- handle-order '<order_json>'`
2. HTTP API: TODO - Add REST endpoint
3. WebSocket: TODO - Add real-time connection
4. Message Queue: TODO - Add RabbitMQ/Redis support

## Security Considerations

- Private keys are never logged or exposed
- All escrows use timelocks for safety
- Atomic swaps ensure all-or-nothing execution
- Safety deposits incentivize proper completion

## TODOs

- [ ] Implement actual TON escrow contract integration
- [ ] Add real EVM escrow factory interaction
- [ ] Implement price oracle for profitability
- [ ] Add REST API server
- [ ] Implement WebSocket for real-time orders
- [ ] Add comprehensive error recovery
- [ ] Implement gas price optimization
- [ ] Add monitoring and metrics
- [ ] Create integration tests

## License

MIT
