import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
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
  // Turbopack native bindings are not available on Windows,
  // so force Webpack for build/dev on this platform.
  ...(process.platform === "win32" ? { webpack: true } : {}),
};

export default nextConfig;
