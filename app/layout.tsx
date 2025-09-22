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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col fitness-gradient`}
      >
        <header className="w-full border-b bg-background/70 glass">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <span className="inline-grid place-items-center size-8 rounded-md bg-primary/15 border border-primary/30">🏋️</span>
              <span>AI Fitness</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-10">
          {children}
        </main>

        <footer className="w-full border-t bg-background/60">
          <div className="container mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
            Built with Next.js and AI · <Link href={'https://atharv-portfolio-ivory.vercel.app'} target='_blank' className="underline-offset-4 hover:underline">Atharv Shelke</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
