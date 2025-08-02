# 1inch Fusion+ TON Implementation

A simple implementation of the 1inch Fusion+ protocol extended to support cross-chain atomic swaps between TON and EVM chains.

## Overview

This project implements a basic relayer and resolver system for enabling secure cross-chain swaps using the 1inch Fusion+ protocol design principles. It follows the atomic swap pattern with hashlocks and timelocks to ensure trustless execution.

## Project Structure

```
├── relayer/          # Monitors blockchain events and notifies resolvers
├── resolver/         # Market maker that executes cross-chain swaps
├── evm/             # EVM escrow contracts deployment
└── tron/            # TON escrow contracts (FunC)
```

## Components

### 1. Relayer (`/relayer`)

- Monitors TON and EVM blockchains for events
- Detects new orders and escrow creations
- Notifies resolvers about swap opportunities
- Tracks order lifecycle and status

### 2. Resolver (`/resolver`)

- Receives order notifications from relayer
- Deploys escrow contracts on both chains
- Executes atomic swaps
- Handles refunds on timeout

### 3. EVM Contracts (`/evm`)

- EscrowFactory: Deploys escrow instances
- EscrowSrc: Source chain escrow
- EscrowDst: Destination chain escrow
- Deployed on Ethereum Sepolia testnet

### 4. TON Contracts (`/tron`)

- ton_source_escrow.fc: Source escrow for TON
- ton_destination_escrow.fc: Destination escrow for TON
- Written in FunC for TON blockchain

## Quick Start

### 1. Deploy EVM Contracts

```bash
cd evm
cp env.example .env
# Configure .env with your mnemonic and RPC URLs
./deploy-escrow-factory-simple.sh
```

### 2. Start Relayer

```bash
cd relayer
npm install
cp env.example .env
# Configure .env
npm run dev -- start
```

### 3. Start Resolver

```bash
cd resolver
npm install
cp env.example .env
# Configure .env with deployed factory address
npm run dev -- start
```

### 4. Run Demo Swap

```bash
# In resolver directory
npm run dev -- demo
```

## Atomic Swap Flow

Based on 1inch Fusion+ whitepaper:

1. **Announcement Phase**: Maker signs order, relayer broadcasts
2. **Deposit Phase**: Resolver deploys escrows on both chains
3. **Withdrawal Phase**: Secret revealed, assets claimed
4. **Recovery Phase**: Refunds if swap fails

## Key Features

- **Simple CLI Interface**: All components use command-line interface
- **Atomic Execution**: Either both swaps succeed or both refund
- **Timelock Safety**: Automatic refunds after timeout
- **Extensible Design**: Easy to add new chains or tokens

## Current Limitations

This is a simplified implementation for demonstration:

- Mock escrow deployments on TON (real contracts need deployment)
- No Dutch auction mechanism (fixed pricing)
- Basic profitability checks
- CLI-based resolver triggering
- No production-ready error handling

## TODOs

- [ ] Deploy and integrate real TON escrow contracts
- [ ] Implement Dutch auction pricing
- [ ] Add comprehensive test suite
- [ ] Create REST API for relayer-resolver communication
- [ ] Add WebSocket support for real-time updates
- [ ] Implement proper gas optimization
- [ ] Add monitoring and metrics
- [ ] Support multiple resolvers
- [ ] Add support for token swaps (Jettons/ERC20)

## References

- [1inch Fusion+ Whitepaper](https://1inch.io/assets/1inch-fusion-plus.pdf)
- [1inch Cross-Chain Swap Contracts](https://github.com/1inch/cross-chain-swap)
- [TON Documentation](https://docs.ton.org)

## License

MIT
