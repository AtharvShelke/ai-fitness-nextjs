'use client';

import { signIn } from 'next-auth/react';
import { useMount } from '@/hooks/useMount';

export function LandingPage() {
  const mounted = useMount();

  return (
    <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.8s ease', minHeight: 'calc(100vh - 88px)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(202,255,60,0.06) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(202,255,60,0.04) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0 }} />

      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        {/* Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(202, 255, 60, 0.05)', border: '1px solid rgba(202, 255, 60, 0.2)', borderRadius: 100, marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', boxShadow: '0 0 12px var(--lime)', animation: 'ob-pulse-ring 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--lime)', textTransform: 'uppercase' }}>
            Elite Level AI Fitness Coach
          </span>
        </div>

        {/* Hero Title */}
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(56px, 10vw, 120px)', lineHeight: 0.85, letterSpacing: '0.02em', color: 'var(--ink)', marginBottom: 24, marginInline: 'auto', maxWidth: 900 }}>
          STOP GUESSING.<br/>
          <span style={{ color: 'transparent', WebkitTextStroke: '1px var(--lime)', WebkitTextFillColor: 'transparent' }}>AUTOMATE</span> YOUR <span style={{ color: 'var(--lime)', textShadow: '0 0 40px rgba(202,255,60,0.3)' }}>GAINS</span>
        </h1>

        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 640, marginBottom: 48 }}>
          Let advanced AI analyze your body, goals, and lifestyle to instantly generate a hyper-personalized training program and comprehensive meal plan. 
        </p>

        {/* CTA Button */}
        <button 
          onClick={() => signIn('google', { callbackUrl: '/' })}
          style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '0 48px', height: 64, background: 'var(--lime)', color: '#07080A',
            fontFamily: "'Montserrat', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
            border: 'none', borderRadius: 4, cursor: 'pointer', overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(202,255,60,0.25)', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {/* Shine effect */}
          <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'skewX(-20deg)', animation: 'gym-shimmer 3s infinite' }} />
          <span>INITIALIZE SYSTEM WITH GOOGLE</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: -2 }}>
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, width: '100%', marginTop: 100 }}>
          {[
            { title: "Smart Training Credits", desc: "Fair usage limits ensuring elite performance and instant generation times for all athletes.", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
            { title: "Perfect Macros & Calories", desc: "Strict AI guardrails ensure your diet plan perfectly matches your exact cut or bulk targets.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            { title: "Instant Routines", desc: "Our global cache automatically serves popular classic routines to load your next workout instantly.", icon: "M4 6h16M4 12h16m-7 6h7" }
          ].map((feat, i) => (
            <div key={i} style={{ padding: 32, background: 'rgba(12,14,18,0.6)', border: '1px solid var(--border)', borderRadius: 4, textAlign: 'left', backdropFilter: 'blur(12px)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--lime-dim)', color: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                 <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={feat.icon}/></svg>
              </div>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink)', marginBottom: 8, textTransform: 'uppercase' }}>{feat.title}</h3>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6 }}>{feat.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
