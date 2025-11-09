/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configure API proxy - all /api/* requests go to Flask backend
  async rewrites() {
    // Only use rewrites in development (proxy to local Flask server)
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:5000/api/:path*',
        },
        // Also proxy uploads
        {
          source: '/uploads/:path*',
          destination: 'http://localhost:5000/uploads/:path*',
        },
      ];
    }
    // In production on Vercel, /api/* routes are handled by serverless functions
    // No rewrites needed - Vercel routes them automatically
    return [];
  },
}

export default nextConfig
