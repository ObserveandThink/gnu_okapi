import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from "@/components/ui/toaster";
import { SpaceProvider } from '@/contexts/SpaceContext';

export const metadata: Metadata = {
  title: 'OkapiFlow',
  description: 'Gamified Process Improvement Companion',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SpaceProvider>
        {children}
        </SpaceProvider>
        <Toaster />
      </body>
    </html>
  );
}
