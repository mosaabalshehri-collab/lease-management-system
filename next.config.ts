import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite تجريبي، نتجاهل تحذيرات البناء المتعلقة بالوحدات الأصلية
  serverExternalPackages: ["node:sqlite"],
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },
};

export default nextConfig;
