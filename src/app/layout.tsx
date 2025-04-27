import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from "@/components/ui/toaster";
import { PT_Mono, VT323 } from 'next/font/google';
import Press_Start_2P from "next/font/google";

const pressStart2P = Press_Start_2P({
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
  weight: '400',
});

const vt323 = VT323({
  subsets: ['latin'],
  variable: '--font-vt323',
  weight: '400',
  display: 'swap',
});

const ptMono = PT_Mono({
  subsets: ['latin'],
  variable: '--font-pt-mono',
  weight: '400',
  display: 'swap',
});

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
    <html lang="en" className={`${pressStart2P.variable} ${vt323.variable} ${ptMono.variable}`}>
      <body className="min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}


