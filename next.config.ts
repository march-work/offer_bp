import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 禁用图片优化（避免构建时下载远程图片）
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
