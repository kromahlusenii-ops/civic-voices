/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mark Playwright and Chromium as external to avoid bundling issues
  // These are only used server-side for PDF generation
  experimental: {
    serverComponentsExternalPackages: [
      "playwright-core",
      "@sparticuz/chromium",
    ],
  },
}

module.exports = nextConfig
