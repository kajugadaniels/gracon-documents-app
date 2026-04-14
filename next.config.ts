import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.dirname(projectRoot);

const nextConfig: NextConfig = {
  transpilePackages: ["@gracon/verification-ui"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
