// app/layout.tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Fitness & Diet Generator',
  description: 'Get personalized workout and diet plans using AI.',
  icons: {
    icon: '/favicon.ico', // Add your favicon if you have one
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <header className="w-full p-4 shadow-sm border-b bg-white dark:bg-black">
          <h1 className="text-xl font-semibold text-center">AI Fitness & Diet Generator</h1>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6">
          {children}
        </main>

        <footer className="w-full p-4 text-center text-sm text-muted-foreground border-t">
          Made with 💪 + 🥗 by your friendly neighborhood dev <Link href={'https://atharv-portfolio-ivory.vercel.app'} target='_blank'>Atharv Shelke</Link>
        </footer>
      </body>
    </html>
  );
}
