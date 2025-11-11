
// Copy config.json from root to frontend directory
import fs from "fs";
import path from "path";
const sourcePath = path.join("../config.json");
const destPath = path.join("./public/config.json");

fs.copyFileSync(sourcePath, destPath);
console.log("✓ config.json copied to frontend public directory");