import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Self-hosted droplet ERPNext — configurable via env. (Migrated off Frappe Cloud; nothing uses FC.)
  env: {
    FRAPPE_SITE: process.env.FRAPPE_SITE || "https://erp.manytalentsmore.com",
  },
};

export default nextConfig;
