/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ljzxzgouucbkprvpifvy.supabase.co'],
  },
  async rewrites() {
    return [
      {
        source: '/tiktok/:path*',
        destination: 'http://localhost:8000/tiktok/:path*',
      },

    ];
  },
};

module.exports = nextConfig