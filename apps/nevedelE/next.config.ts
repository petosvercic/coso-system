import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["coso-engine", "coso-contract"],
};

export default nextConfig;
