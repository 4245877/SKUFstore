import type { NextConfig } from "next";

const deployTarget = process.env.DEPLOY_TARGET ?? "server";
const isPages = deployTarget === "pages";
const basePath = isPages
  ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "")
  : "";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(isPages
    ? {
        output: "export",
        ...(basePath ? { basePath } : {}),
      }
    : {
        output: "standalone",
      }),
};

export default nextConfig;