/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@scar/core"],
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
