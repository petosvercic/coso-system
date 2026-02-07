/** @type {import("next").NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/:slug((?!api|_next|list|builder|factory-login|e|soc-stat).*)",
        destination: "/e/:slug",
      },
    ];
  },

  // Monorepo workspace packages used by this app
  transpilePackages: ["coso-engine", "coso-contract"],

  // Next 16: this key is top-level (not experimental)
  outputFileTracingIncludes: {
    "/*": ["./data/editions/**", "./data/editions.json"],
    "/api/*": ["./data/editions/**", "./data/editions.json"],
  },
};

module.exports = nextConfig;
