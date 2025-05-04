// next.config.ts
import type { NextConfig } from 'next';
import WorkboxPlugin from 'workbox-webpack-plugin';
import path from 'path'; // Need path module

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, buildId, dev }) => {
    // Only run Workbox plugin in production build for the client-side bundle
    if (!isServer && !dev) {
      config.plugins.push(
        new WorkboxPlugin.InjectManifest({
          swSrc: path.join(__dirname, 'src/lib/sw.ts'), // Path to your custom service worker logic
          swDest: path.join(__dirname, 'public/sw.js'), // Output path in the public directory
          // Ensure Workbox libs are available
          // Exclude files that shouldn't be precached (like map files, dev files)
          exclude: [
            /\.map$/,
            /manifest\.json$/,
            /react-refresh\.js$/,
            /_buildManifest\.js$/,
            /_ssgManifest\.js$/,
            /_middlewareManifest\.js$/,
            /build-manifest\.json$/,
             // Exclude API routes from precaching
            /\/api\//,
          ],
          // Modify URL paths for Next.js specific routing if needed
           // Example: Map build-specific asset paths to general paths
           modifyURLPrefix: {
             // Adjust if your static assets are served from a different path in production
             '/_next/static/': '/_next/static/',
           },
          // Define runtime caching rules for API calls, images, etc.
          // Example: Cache API responses using StaleWhileRevalidate
          // runtimeCaching: [
          //   {
          //     urlPattern: /^https:\/\/yourapi\.com\/.*$/,
          //     handler: 'StaleWhileRevalidate',
          //     options: {
          //       cacheName: 'api-cache',
          //       expiration: {
          //         maxEntries: 50,
          //         maxAgeSeconds: 60 * 60 * 24, // 1 day
          //       },
          //     },
          //   },
          //   {
          //     urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          //     handler: 'CacheFirst',
          //     options: {
          //       cacheName: 'image-cache',
          //       expiration: {
          //         maxEntries: 60,
          //         maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          //       },
          //     },
          //   },
          // ],
          // Add buildId to the list of things to cache bust
          additionalManifestEntries: [
            // Add other static files from `public` directory if needed
            { url: '/manifest.json', revision: buildId },
            // Add icons etc.
          ],
        })
      );
    }

    return config;
  },
};

export default nextConfig;
