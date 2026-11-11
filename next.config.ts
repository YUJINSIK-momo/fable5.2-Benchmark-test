import type { NextConfig } from "next";

// GitHub Pages 는 /<저장소 이름>/ 아래에서 열리므로 배포 때만 경로를 붙인다.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default config;
