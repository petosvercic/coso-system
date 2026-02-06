/** @type {import("next").NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/:slug((?!api|_next|list|builder|factory-login|e).*)",
        destination: "/e/:slug",
      },
    ];
  },

  experimental: {
    // Donútime Next/Vercel pribaliť editions JSONy do serverless bundlov
    outputFileTracingIncludes: {
      "/*": ["./data/editions/**", "./data/editions.json"],
      "/api/*": ["./data/editions/**", "./data/editions.json"],
    },
  },
};

module.exports = nextConfig;
