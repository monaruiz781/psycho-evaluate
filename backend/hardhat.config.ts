import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

// Import scripts to register tasks
import "./scripts/generate-frontend-artifacts";

// Run 'npx hardhat vars setup' to see the list of variables that need to be set
//
// Environment variables can be set via:
//   PowerShell: $env:MNEMONIC="your mnemonic"
//   Bash: export MNEMONIC="your mnemonic"
//   Or use: npx hardhat vars set MNEMONIC
//
// vars.get() checks in this order:
//   1. Hardhat vars storage (set via 'npx hardhat vars set')
//   2. Environment variables (process.env)
//   3. Default value (if provided)

// Helper function to get config value: prioritize process.env, then vars.get(), then default
function getConfig(key: string, defaultValue: string): string {
  return process.env[key] || vars.get(key, defaultValue);
}

const MNEMONIC: string = getConfig("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY: string = getConfig("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
const SEPOLIA_RPC_URL: string = getConfig("SEPOLIA_RPC_URL", "");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: getConfig("ETHERSCAN_API_KEY", ""),
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    anvil: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
        count: 10,
      },
      chainId: 11155111,
      url: SEPOLIA_RPC_URL || `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.24",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;

