import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Pin the workspace root so Turbopack doesn't pick up a stray lockfile
  // higher up the directory tree on the build machine.
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
