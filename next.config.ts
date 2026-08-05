import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security-headers";
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() { return [{ source: "/(.*)", headers: [...securityHeaders] }]; },
};
export default nextConfig;
