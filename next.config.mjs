import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

// ローカルの next dev で Cloudflare バインディング（D1 等）を有効化する
initOpenNextCloudflareForDev()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: PR3 で ESLint / 型エラーを解消したら外す
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
