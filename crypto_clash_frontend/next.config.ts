import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/crypto_clash",
  output: "export",  // <=== enables static exports
  reactStrictMode: true,
};

export default nextConfig;
