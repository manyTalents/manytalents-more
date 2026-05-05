import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Frappe Cloud site — configurable via env
  env: {
    FRAPPE_SITE: process.env.FRAPPE_SITE || "https://manytalentsmore.v.frappe.cloud",
  },
};

export default nextConfig;
