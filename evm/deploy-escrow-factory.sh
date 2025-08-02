#!/bin/bash

echo "🚀 Deploying Escrow Factory for TON Fusion+"
echo "==========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy env.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$MNEMONIC" ]; then
    echo "❌ Error: MNEMONIC not set in .env"
    exit 1
fi

if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "❌ Error: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

# Navigate to cross-chain-swap directory
cd cross-chain-swap

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Error: Foundry not installed!"
    echo "Install with: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
forge install

# Build contracts
echo "🔨 Building contracts..."
forge build

# Deploy to Sepolia testnet
echo "🌐 Deploying to Sepolia testnet..."
echo "RPC URL: $SEPOLIA_RPC_URL"

# Derive private key from mnemonic using cast (Foundry tool)
echo "🔑 Deriving private key from mnemonic..."
PRIVATE_KEY=$(cast wallet private-key --mnemonic "$MNEMONIC" --mnemonic-index 0)
DEPLOYER_ADDRESS=$(cast wallet address --mnemonic "$MNEMONIC" --mnemonic-index 0)

echo "Deployer address: $DEPLOYER_ADDRESS"

# Check balance
echo "💰 Checking balance..."
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL)
BALANCE_ETH=$(cast from-wei $BALANCE)
echo "Balance: $BALANCE_ETH ETH"

if [ "$BALANCE" = "0" ]; then
    echo "❌ Error: Deployer address has no ETH balance!"
    echo "Please fund the address: $DEPLOYER_ADDRESS"
    exit 1
fi

# Use the existing 1inch deployment script
echo "📝 Using existing 1inch deployment script..."

# Export deployer address for the script
export DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS

# Run the existing deployment script
PRIVATE_KEY=$PRIVATE_KEY forge script script/DeployEscrowFactory.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Note the deployed contract addresses"
echo "2. Update resolver and relayer configurations"
echo "3. Deploy TON escrow contracts"