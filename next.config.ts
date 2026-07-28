import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Uploaded media is streamed through /api/media/* so it works on any host.
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb", // media uploads go through server actions
    },
  },
};

export default nextConfig;
