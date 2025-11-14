import dotenv from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ContractDeploymentConfig {
   name: string;
   artifactPath: string;
   deployArgs?: unknown[];
   configKeys: {
      address: string;
      abi: string;
   };
}

async function deployContract(
   signer: ethers.Signer,
   config: ContractDeploymentConfig
): Promise<{ address: string; abi: unknown }> {
   const artifactPath = path.join(__dirname, "../../artifacts/contracts", config.artifactPath);

   if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found at ${artifactPath}. Please compile the contracts first.`);
   }

   const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
   const contractABI = artifact.abi;
   const contractBytecode = artifact.bytecode;

   const factory = new ethers.ContractFactory(contractABI, contractBytecode, signer);

   console.log(`Deploying ${config.name} contract...`);
   const deployedContract = await factory.deploy(...(config.deployArgs || []));
   await deployedContract.waitForDeployment();

   console.log(`✓ ${config.name} deployed to:`, deployedContract.target);

   return {
      address: deployedContract.target as string,
      abi: contractABI
   };
}

async function main() {
   // Create provider and signer
   const provider = new ethers.JsonRpcProvider(process.env.API_URL);
   const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

   const config: any = {};
   const deployedContracts: any = {};

   // Load existing config if it exists
   const configPath = path.join(__dirname, "../../../config.json");
   if (fs.existsSync(configPath)) {
      Object.assign(config, JSON.parse(fs.readFileSync(configPath, "utf8")));
   }

   // Define contracts to deploy
   const contractsToDeploy: ContractDeploymentConfig[] = [
      {
         name: "HelloWorld",
         artifactPath: "testcontract.sol/HelloWorld.json",
         deployArgs: ["Hello World!"],
         configKeys: {
            address: "CONTRACT_ADDRESS",
            abi: "ABI"
         }
      },
      {
         name: "Game",
         artifactPath: "Game.sol/Game.json",
         deployArgs: [],
         configKeys: {
            address: "GAME_CONTRACT_ADDRESS",
            abi: "GAME_ABI"
         }
      }
   ];

   // Deploy all contracts
   for (const contractConfig of contractsToDeploy) {
      const deployed = await deployContract(signer, contractConfig);
      config[contractConfig.configKeys.address] = deployed.address;
      config[contractConfig.configKeys.abi] = deployed.abi;
   }

   // Save configuration
   config.API_URL = process.env.API_URL;
   fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

   console.log("\n✓ All contracts deployed successfully!");
   console.log("✓ Configuration saved to config.json");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });