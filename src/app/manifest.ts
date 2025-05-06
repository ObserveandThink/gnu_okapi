// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Okapi',
    short_name: 'Okapi',
    description: 'Gamified Process Improvement Companion',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff', // Match your globals.css --background in HSL if possible
    theme_color: '#336B6B', // Match your globals.css --primary or --accent
    icons: [
      {
        src: '/favicon.ico', // Assuming you have a favicon
        sizes: 'any',
        type: 'image/x-icon',
      },
       {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
       },
       {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
       },
    ],
  };
}
