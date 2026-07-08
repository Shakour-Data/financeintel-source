import type { NextConfig } from "next";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
    resolveAlias: {
      "framer-motion": resolve(__dirname, "src/lib/framer-motion-shim.tsx"),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "framer-motion": resolve(__dirname, "src/lib/framer-motion-shim.tsx"),
    };
    return config;
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "space-z.ai",
    "0.0.0.0",
    "localhost",
    "localhost:81",
    "0.0.0.0:81",
    "127.0.0.1",
    "21.0.3.44",
  ],
};

export default nextConfig;
