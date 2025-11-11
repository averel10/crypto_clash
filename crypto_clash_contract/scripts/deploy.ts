import dotenv from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
   const artifactPath = path.join(
      __dirname,
      "../../artifacts/contracts/testcontract.sol/HelloWorld.json"
   );

   if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found at ${artifactPath}. Please compile the contracts first.`);
   }

   const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
   const contractABI = artifact.abi;
   const contractBytecode = artifact.bytecode;

   // Create provider and signer
   const provider = new ethers.JsonRpcProvider(process.env.API_URL);
   const signer = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY!, provider);

   // Create contract factory
   const HelloWorldFactory = new ethers.ContractFactory(
      contractABI,
      contractBytecode,
      signer
   );

   // Deploy the contract
   console.log("Deploying HelloWorld contract...");
   const hello_world = await HelloWorldFactory.deploy("Hello World!");
   
   // Wait for deployment to complete
   await hello_world.waitForDeployment();
   
   console.log("Contract deployed to address:", hello_world.target);

    // Save contract address to config.json
    const configPath = path.join(__dirname, "../../../config.json");
    let config = {};
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    (config as any).CONTRACT_ADDRESS = hello_world.target;
    (config as any).API_URL = process.env.API_URL;
    (config as any).ABI = contractABI;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    console.log("✓ Contract address saved to config.json");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });