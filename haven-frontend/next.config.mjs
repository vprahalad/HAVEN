import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turbopack configuration for path aliases
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname),
    },
  },
  // Explicit webpack configuration for path aliases
  webpack: (config, { dir }) => {
    // dir is the absolute path to the project root (haven-frontend when rootDir is set)
    const projectRoot = path.resolve(dir);
    
    // Override the @ alias to point to project root
    // This must match tsconfig.json paths configuration
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Set the alias - this will resolve @/lib/api to {projectRoot}/lib/api
    config.resolve.alias['@'] = projectRoot;
    
    return config;
  },
  // Configure API proxy - all /api/* requests go to Flask backend
  async rewrites() {
    // Use environment variable for backend URL in production, localhost in development
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    
    // If backendUrl doesn't have protocol, add https:// (for Render host property)
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // Also proxy uploads
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
}

export default nextConfig
