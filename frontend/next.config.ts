import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  output: "export",
  images: {
    unoptimized: true,
  },
  webpack: (config, { webpack, dev }) => {
    // Only ignore @fhevm/mock-utils in production builds.
    // In development, we want the mock utilities available for Hardhat testing.
    if (!dev) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@fhevm\/mock-utils$/,
        })
      );
    }

    return config;
  },
};

export default nextConfig;

