# EVM Escrow Contracts for TON Fusion+

This directory contains the deployment setup for the EVM side of the TON Fusion+ cross-chain swap protocol.

## Overview

We use the existing 1inch cross-chain-swap contracts which provide:

- `EscrowFactory`: Factory contract to deploy escrows
- `EscrowSrc`: Source chain escrow contract (locks user funds)
- `EscrowDst`: Destination chain escrow contract (receives resolver funds)

## Setup

1. **Install Foundry** (required for deployment):

   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Configure Environment**:
   ```bash
   cp env.example .env
   # Edit .env with your values:
   # - MNEMONIC: Your 12-word mnemonic phrase for wallet generation
   # - SEPOLIA_RPC_URL: Your Sepolia RPC endpoint
   # - ETHERSCAN_API_KEY: For contract verification
   ```

## Deployment

### Option 1: Quick Deploy Script (Recommended)

```bash
./deploy-escrow-factory.sh
```

This script will:

- Install dependencies in the cross-chain-swap submodule
- Build the contracts
- Deploy to Sepolia testnet
- Verify contracts on Etherscan

### Option 2: Manual Foundry Deployment

```bash
cd cross-chain-swap
forge install
forge build

# Derive private key from mnemonic
export PRIVATE_KEY=$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 0)

forge script script/DeployEscrowFactory.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### Option 3: Hardhat (for reference only)

```bash
npm install
npx hardhat run scripts/deploy.js --network sepolia
```

## Contract Addresses

After deployment, you'll get:

- **EscrowFactory**: Main factory contract
- **EscrowSrc Implementation**: Template for source escrows
- **EscrowDst Implementation**: Template for destination escrows

## Integration with TON Fusion+

The deployed contracts work with:

- **Relayer**: Monitors events and notifies resolvers
- **Resolver**: Deploys escrows and executes swaps

Update the configurations:

1. In `relayer/.env`: Set `EVM_RESOLVER_CONTRACT` to the factory address
2. In `resolver/.env`: Set `EVM_ESCROW_FACTORY` to the factory address

## How It Works

1. **Order Creation**: User creates cross-chain swap order
2. **Escrow Deployment**: Resolver deploys escrows on both chains using factories
3. **Asset Locking**: Funds locked with hashlock/timelock (HTLC)
4. **Secret Reveal**: Resolver reveals secret to claim funds
5. **Completion**: Atomic swap completed

## Security Features

- **Hashlock**: SHA-256 hash verification
- **Timelock**: Different expiry times for source/destination
- **Rescue Delay**: 8 days default for emergency recovery
- **Access Control**: Only whitelisted resolvers can deploy

## Testing on Testnet

1. Deploy factory on Sepolia
2. Create test order through relayer
3. Resolver deploys escrows
4. Execute test swap
5. Verify on Etherscan

## Mainnet Deployment

For mainnet deployment:

1. Audit the contracts thoroughly
2. Use proper access control settings
3. Set appropriate rescue delays
4. Whitelist trusted resolvers only

## Resources

- [1inch Cross-Chain Swap Repo](https://github.com/1inch/cross-chain-swap)
- [1inch Fusion+ Documentation](https://docs.1inch.io/docs/fusion-swap/introduction)
- [Foundry Documentation](https://book.getfoundry.sh/)
