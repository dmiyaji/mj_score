import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

// ローカルの next dev で Cloudflare バインディング（D1 等）を有効化する
initOpenNextCloudflareForDev()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default nextConfig
