import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react', 'lucide-react', 'base-ui'],
  },
};

export default nextConfig;
