require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

let PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
if (PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000000" && !PRIVATE_KEY.startsWith("0x")) {
  PRIVATE_KEY = "0x" + PRIVATE_KEY;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "cancun"
    }
  },
  networks: {
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: [PRIVATE_KEY],
      // Since Arc uses USDC for gas, standard EVM transaction gas estimates and prices work out-of-the-box.
      // However, we can specify fee configurations if needed.
    }
  }
};
