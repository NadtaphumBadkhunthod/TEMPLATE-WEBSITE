import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /*
   * Pin the workspace root to this project.
   *
   * Next walks up the tree looking for lockfiles and picks the outermost one. On
   * a machine with an unrelated package-lock.json in the home directory it
   * therefore infers the home directory as the root and traces files from there,
   * which is both slow and wrong. `npm run dev`/`build` always run from this
   * folder, so cwd is the correct root.
   */
  outputFileTracingRoot: process.cwd(),
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
