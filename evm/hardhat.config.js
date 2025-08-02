require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Get accounts from mnemonic
const accounts = process.env.MNEMONIC ? { mnemonic: process.env.MNEMONIC } : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://eth-sepolia.g.alchemy.com/v2/demo",
      accounts,
      chainId: 11155111,
    },
    goerli: {
      url:
        process.env.GOERLI_RPC_URL ||
        "https://eth-goerli.g.alchemy.com/v2/demo",
      accounts,
      chainId: 5,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
