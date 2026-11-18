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
  // Cap build workers: the build host reports ~64 CPUs but has a low
  // thread limit, so the default (one worker per CPU) exhausts threads
  // during "Collecting page data" and crashes with os error 11.
  experimental: {
    cpus: 4,
  },
};

export default nextConfig;
