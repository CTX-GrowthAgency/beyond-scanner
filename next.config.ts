import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker/server deployments
  output: "standalone",
  // Ensure html5-qrcode is only loaded client-side
  experimental: {},
};

export default nextConfig;
