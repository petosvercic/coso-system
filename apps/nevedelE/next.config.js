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
};

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Donútime Next/Vercel pribaliť editions JSONy do serverless bundlov
    outputFileTracingIncludes: {
      // zahrň pre všetky routy (najjednoduchšie, nech neriešime patterny)
      "/*": ["./data/editions/**", "./data/editions.json"],
      "/api/*": ["./data/editions/**", "./data/editions.json"],
    },
  },
};

module.exports = nextConfig;
