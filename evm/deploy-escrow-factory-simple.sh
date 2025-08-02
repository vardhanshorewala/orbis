#!/bin/bash

echo "🚀 Deploying Escrow Factory for TON Fusion+ on Sepolia"
echo "====================================================="

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

# Create a simple deployment script without CREATE3
cat > script/DeploySimple.s.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Script } from "forge-std/Script.sol";
import { EscrowFactory } from "../contracts/EscrowFactory.sol";
import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { console } from "forge-std/console.sol";

contract DeploySimple is Script {
    uint32 public constant RESCUE_DELAY = 691200; // 8 days
    
    // Sepolia testnet addresses
    address public constant LOP = 0x111111125421cA6dc452d289314280a0f8842A65; // 1inch Limit Order Protocol
    address public constant ACCESS_TOKEN = address(0); // No access token on testnet

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying with account:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy EscrowFactory directly
        EscrowFactory factory = new EscrowFactory(
            LOP,
            IERC20(ACCESS_TOKEN), // Cast to IERC20
            deployer, // owner
            RESCUE_DELAY, // rescue delay for source
            RESCUE_DELAY  // rescue delay for destination
        );
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Successful ===");
        console.log("EscrowFactory deployed at:", address(factory));
        console.log("Source Escrow Implementation:", factory.ESCROW_SRC_IMPLEMENTATION());
        console.log("Destination Escrow Implementation:", factory.ESCROW_DST_IMPLEMENTATION());
        console.log("============================\n");
    }
}
EOF

# Run deployment
PRIVATE_KEY=$PRIVATE_KEY forge script script/DeploySimple.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vvvv

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Note the deployed contract addresses above"
echo "2. Update resolver configuration with EscrowFactory address"
echo "3. Update relayer configuration with EscrowFactory address"
echo "4. Deploy TON escrow contracts"