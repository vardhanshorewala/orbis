const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
  console.log("Deploying Escrow Factory for TON Fusion+...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address))
  );

  // Deployment parameters (from 1inch cross-chain-swap)
  const LIMIT_ORDER_PROTOCOL =
    process.env.LIMIT_ORDER_PROTOCOL ||
    "0x111111125421cA6dc452d289314280a0f8842A65";
  const ACCESS_TOKEN =
    process.env.ACCESS_TOKEN || "0xACCe550000159e70908C0499a1119D04e7039C28";
  const RESCUE_DELAY = parseInt(process.env.RESCUE_DELAY_SECONDS || "691200"); // 8 days default

  console.log("\nDeployment parameters:");
  console.log("- Limit Order Protocol:", LIMIT_ORDER_PROTOCOL);
  console.log("- Access Token:", ACCESS_TOKEN);
  console.log("- Rescue Delay:", RESCUE_DELAY, "seconds");
  console.log("- Owner:", deployer.address);

  // Read the compiled artifacts from cross-chain-swap
  const crossChainSwapPath = path.join(__dirname, "../cross-chain-swap");

  // For now, we'll use a simplified deployment approach
  // TODO: Integrate with the actual 1inch cross-chain-swap contracts

  console.log("\n⚠️  Note: This is a simplified deployment script.");
  console.log(
    "For production deployment, use the 1inch cross-chain-swap Foundry scripts:"
  );
  console.log("1. cd cross-chain-swap");
  console.log("2. forge install");
  console.log("3. ./scripts/deploy.sh <network> <keystore>");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    parameters: {
      limitOrderProtocol: LIMIT_ORDER_PROTOCOL,
      accessToken: ACCESS_TOKEN,
      rescueDelay: RESCUE_DELAY,
    },
    contracts: {
      // Will be populated when contracts are deployed
      escrowFactory: null,
      escrowSrcImplementation: null,
      escrowDstImplementation: null,
    },
  };

  // Create deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentPath = path.join(
    deploymentsDir,
    `${network.name}-deployment.json`
  );
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✅ Deployment info saved to: ${deploymentPath}`);

  console.log("\n📝 Next steps:");
  console.log("1. Deploy the actual contracts using Foundry:");
  console.log(
    "   cd cross-chain-swap && forge script script/DeployEscrowFactory.s.sol --fork-url <RPC_URL> --broadcast"
  );
  console.log(
    "2. Update the resolver and relayer configs with deployed addresses"
  );
  console.log("3. Deploy TON escrow contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
