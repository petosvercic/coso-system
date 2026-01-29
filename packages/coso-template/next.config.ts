import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["coso-contract", "coso-engine"],
  turbopack: {
    root: path.resolve(__dirname)
  }
};

export default nextConfig;
