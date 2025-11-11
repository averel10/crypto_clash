import { defineConfig } from "hardhat/config";

import dotenv from "dotenv";
dotenv.config();
const { API_URL = "", WALLET_PRIVATE_KEY = "" } = process.env;

export default defineConfig({
  solidity: {
    version: "0.8.28",
  },
  networks: {
    testnet: {
      url: API_URL,
      accounts: [WALLET_PRIVATE_KEY],
      type: "http"
    }
  }
});
