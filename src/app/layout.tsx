// src/app/layout.tsx
'use client'; // Keep 'use client' here for the Provider

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SpaceProvider } from '@/contexts/SpaceContext'; // Correct path
import type { AppProps } from 'next/app'; // Import AppProps if needed elsewhere, but not Metadata here

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
        {/* SpaceProvider now wraps the entire application */}
        <SpaceProvider>
          {children}
        </SpaceProvider>
        <Toaster />
      </body>
    </html>
  );
}
