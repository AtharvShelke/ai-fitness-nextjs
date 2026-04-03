// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, DM_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

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
  title: 'OBSIDIAN — Elite Performance System',
  description: 'The fitness protocol built for those who train like athletes and live like executives.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Bebas Neue — condensed display. Barlow Condensed — readable mid-weight */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700&family=Barlow:wght@300;400;500&family=DM+Mono:wght@300;400;500&display=swap"
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
          background: 'rgba(8,8,9,0.88)',
          backdropFilter: 'blur(20px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        }}>
          <div style={{
            maxWidth: 1280, margin: '0 auto',
            padding: '0 28px',
            height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {/* Wordmark */}
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28, height: 28,
                background: 'var(--lime)',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 22, letterSpacing: '0.14em',
                color: 'var(--ink)', lineHeight: 1,
              }}>
                OBSIDIAN
              </span>
            </Link>


            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: 'var(--ink-3)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                v0.0.1
              </span>
              <div style={{
                width: 32, height: 32,
                border: '1px solid var(--border-bright)',
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ width: 12, height: 1, background: 'var(--ink-2)' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── MARQUEE ─────────────────────────────────────────── */}
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          overflow: 'hidden',
          height: 32,
          display: 'flex', alignItems: 'center',
        }}>
          {/*
            Seamless loop technique:
            - marquee-inner is a single flat flex row containing the item list TWICE
            - animation translates exactly -50%, landing pixel-perfect on copy 2's start
            - when copy 1 scrolls off the left edge, copy 2 is already in view
            - the animation resets to 0 and the cycle repeats invisibly
          */}
          <div className="marquee-wrap" style={{ flex: 1, overflow: 'hidden' }}>
            <div className="marquee-inner" aria-hidden="true">
              {/* Copy 1 + Copy 2 — flat siblings, NOT nested divs */}
              {[0, 1].map(rep => (
                <span key={rep} style={{ display: 'contents' }}>
                  {[
                    'PRECISION TRAINING PROTOCOL',
                    'AI-GENERATED NUTRITION SYSTEM',
                    'PERIODIZED PERFORMANCE PLAN',
                    'ELITE ATHLETE METHODOLOGY',
                    'ADAPTIVE LOAD MANAGEMENT',
                    'SCIENCE-BACKED PROGRAMMING',
                  ].map((text, i) => (
                    <span key={`${rep}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 10, letterSpacing: '0.2em',
                        color: 'var(--ink-3)', padding: '0 24px',
                        textTransform: 'uppercase', fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}>
                        {text}
                      </span>
                      <span style={{ color: 'var(--lime)', fontSize: 8, opacity: 0.6, flexShrink: 0 }}>◆</span>
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>

        <main style={{ flex: 1 }}>
          {children}
        </main>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-2)',
        }}>
          <div style={{
            maxWidth: 1280, margin: '0 auto',
            padding: '18px 28px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 13, letterSpacing: '0.18em',
              color: 'var(--ink-3)',
            }}>
              OBSIDIAN PERFORMANCE SYSTEMS
            </span>
            <Link
              href="https://atharv-shelke.vercel.app"
              target="_blank"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: 'var(--lime)',
                letterSpacing: '0.1em', textDecoration: 'none',
                opacity: 0.7, transition: 'opacity 0.2s',
              }}
            >
              ↗ ATHARV SHELKE
            </Link>
          </div>
        </footer>

        {/* ── SYSTEM STATUS OVERLAY ────────────────────────────────────── */}
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'rgba(8,8,9,0.88)',
          backdropFilter: 'blur(20px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
          border: '1px solid var(--border)',
          padding: '12px 18px',
          borderRadius: 2,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#ff4444',
            boxShadow: '0 0 8px #ff4444',
            animation: 'pulse-dot-red 2s infinite',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              System Alert
            </span>
            <span style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13,
              color: 'var(--ink)',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}>
              LLM Currently Unavailable
            </span>
          </div>
        </div>

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