// src/app/layout.tsx
'use client'; // Keep 'use client' here for the Provider

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SpaceProvider } from '@/contexts/SpaceContext'; // Correct path
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'; // Import the registrar

// Remove metadata export as it cannot be in a 'use client' file
// export const metadata: Metadata = {
//   title: 'OkapiFlow',
//   description: 'Gamified Process Improvement Companion',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground"> {/* Added default styles */}
        {/* Service Worker Registrar (client-side only) */}
        <ServiceWorkerRegistrar />

        {/* SpaceProvider now wraps the entire application */}
        <SpaceProvider>
          {children}
        </SpaceProvider>
        <Toaster />
      </body>
    </html>
  );
}
