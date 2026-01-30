/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: { externalDir: true },
  transpilePackages: ["coso-engine", "coso-contract"],
};
module.exports = nextConfig;
