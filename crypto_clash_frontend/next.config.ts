import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/crypto_clash",
  assetPrefix: "/crypto_clash",
  distDir: "/crypto_clash",
  output: "export",  // <=== enables static exports
  reactStrictMode: true,
};

export default nextConfig;
