/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Artwork images are served straight from the museum CDN and optimised by
  // Next's image pipeline (resize + WebP + lazy loading) rather than by us.
  images: {
    domains: ['images.metmuseum.org'],
    deviceSizes: [320, 420, 640, 768, 1024, 1280],
    imageSizes: [170, 240, 300, 380, 520],
  },
}

module.exports = nextConfig
