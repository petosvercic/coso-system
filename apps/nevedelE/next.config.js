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