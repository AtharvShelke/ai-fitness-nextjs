// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, DM_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Providers } from '@/components/Providers';
import { SignOutButton } from '@/components/SignOutButton';
import { SystemStatusOverlay } from '@/components/SystemStatusOverlay';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const bebas = Bebas_Neue({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400'],
});

const dmMono = DM_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: 'Obsidian Fitness — Your AI Fitness Trainer | AI Workout & Diet Generator',
  description: 'Obsidian Fitness uses AI to generate your personalized workout routine and nutrition plan in seconds. Free. Instant. Science-backed.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  
  let tokenBalance = 0;
  let tier = "FREE";
  
  if (session?.user?.email) {
      const userRecord = await prisma.user.findUnique({ 
          where: { email: session.user.email },
          select: { tokenBalance: true, tier: true }
      });
      if (userRecord) {
          tokenBalance = userRecord.tokenBalance;
          tier = userRecord.tier;
      }
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700&family=Barlow:wght@300;400;500&family=DM+Mono:wght@300;400;500&family=Montserrat:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${bebas.variable} ${dmMono.variable} grain-overlay`}
        style={{
          fontFamily: "'Barlow', system-ui, sans-serif",
          background: 'var(--bg)',
          color: 'var(--ink)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid var(--border)',
          background: 'rgba(7,8,10,0.90)',
          backdropFilter: 'blur(24px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        }}>
          <div style={{
            maxWidth: 1320, margin: '0 auto',
            padding: '0 28px',
            height: 58,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Brand */}
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Obsidian crystal mark */}
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                {/* Outer crystal */}
                <polygon points="14,2 26,9 26,19 14,26 2,19 2,9" fill="none" stroke="#CAFF3C" strokeWidth="1" opacity="0.35" />
                {/* Inner facets */}
                <polygon points="14,5 23,10.5 23,17.5 14,23 5,17.5 5,10.5" fill="none" stroke="#CAFF3C" strokeWidth="0.6" opacity="0.2" />
                {/* Core gem */}
                <polygon points="14,8 20,12 20,16 14,20 8,16 8,12" fill="#CAFF3C" opacity="0.9" />
                {/* Highlight facet */}
                <polygon points="14,8 20,12 14,14" fill="#07080A" opacity="0.35" />
                {/* Glow dot */}
                <circle cx="14" cy="11" r="1.5" fill="white" opacity="0.6" />
              </svg>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: '0.14em',
                color: 'var(--ink)', lineHeight: 1,
              }}>
                OBSIDIAN <span style={{ color: 'var(--lime)' }}>FITNESS</span>
              </span>
            </Link>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {session?.user && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', background: 'var(--surface-2)',
                    borderRadius: 100, border: '1px solid var(--border)',
                  }}>
                    <span style={{ 
                      width: 6, height: 6, borderRadius: '50%', 
                      background: tokenBalance > 0 ? 'var(--lime)' : '#ff4444',
                      boxShadow: tokenBalance > 0 ? '0 0 8px var(--lime)' : '0 0 8px #ff4444'
                    }} />
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 11, color: 'var(--ink-2)',
                      letterSpacing: '0.05em'
                    }}>
                      {tokenBalance} <span style={{opacity: 0.5}}>TOKENS</span>
                    </span>
                    <span style={{
                      marginLeft: 4, padding: '2px 6px',
                      background: tier === 'ELITE' ? 'linear-gradient(45deg, #CAFF3C, #8CFF00)' : 'var(--bg-3)',
                      color: tier === 'ELITE' ? '#07080A' : 'var(--ink-3)',
                      borderRadius: 4, fontSize: 9, fontWeight: 700,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: '0.1em'
                    }}>
                      {tier}
                    </span>
                  </div>
                  
                  <Link href="/history" style={{
                    color: 'var(--lime)', textDecoration: 'none', fontSize: 13,
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                    letterSpacing: '0.1em', transition: 'color 0.2s',
                  }}>
                    HISTORY
                  </Link>
                  <SignOutButton />
                </>
              )}
              <span className="fitness-badge">AI Powered</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: 'var(--ink-3)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                v1.0
              </span>
            </div>
          </div>
        </nav>

        {/* ── MARQUEE — fitness mottos ─────────────────────────── */}
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          overflow: 'hidden',
          height: 30,
          display: 'flex', alignItems: 'center',
        }}>
          <div className="marquee-wrap" style={{ flex: 1, overflow: 'hidden' }}>
            <div className="marquee-inner" aria-hidden="true">
              {[0, 1].map(rep => (
                <span key={rep} style={{ display: 'contents' }}>
                  {[
                    'TRAIN HARD. EAT SMART.',
                    'YOUR GOALS. YOUR PLAN.',
                    'AI-POWERED NUTRITION',
                    'PERSONALIZED WORKOUT PLAN',
                    'FUEL YOUR GAINS',
                    'PUSH YOUR LIMITS EVERY REP',
                    'SCIENCE-BACKED PROGRAMMING',
                  ].map((text, i) => (
                    <span key={`${rep}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 10, letterSpacing: '0.2em',
                        color: 'var(--ink-3)', padding: '0 24px',
                        textTransform: 'uppercase', fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        {text}
                      </span>
                      <span style={{ color: 'var(--lime)', fontSize: 7, opacity: 0.55, flexShrink: 0 }}>◆</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        <main style={{ flex: 1 }}>
          <Providers>
            {children}
          </Providers>
        </main>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-2)',
        }}>
          <div style={{
            maxWidth: 1320, margin: '0 auto',
            padding: '16px 28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13, letterSpacing: '0.18em',
                color: 'var(--ink-3)',
              }}>
                OBSIDIAN FITNESS
              </span>
              <span style={{ color: 'var(--border-hi)', fontSize: 10 }}>·</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, letterSpacing: '0.1em',
                color: 'var(--ink-4)', textTransform: 'uppercase',
              }}>
                YOUR AI FITNESS TRAINER
              </span>
            </div>
            <Link
              href="https://atharv-shelke.vercel.app"
              target="_blank"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: 'var(--lime)',
                letterSpacing: '0.1em', textDecoration: 'none',
                opacity: 0.65, transition: 'opacity 0.2s',
              }}
            >
              ↗ ATHARV SHELKE
            </Link>
          </div>
        </footer>

        {/* ── SYSTEM STATUS OVERLAY ────────────────────────────────────── */}
        <SystemStatusOverlay />

        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--lime); }
            50%       { opacity: 0.4; box-shadow: 0 0 3px var(--lime); }
          }
          @keyframes pulse-dot-red {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px #ff4444; background: #ff4444; }
            50%       { opacity: 0.4; box-shadow: 0 0 2px #ff4444; background: rgba(255, 68, 68, 0.6); }
          }
        `}</style>
      </body>
    </html>
  );
}