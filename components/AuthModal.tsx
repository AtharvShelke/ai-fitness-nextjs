'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export function AuthModal() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === 'loading' || session) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5, 5, 5, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        padding: '40px 32px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: 20 }}>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, lineHeight: 1, marginBottom: 16, color: 'var(--ink)' }}>
          SIGN IN TO GENERATE
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 32 }}>
          To prevent abuse, we limit AI protocol generation. Sign in securely with Google to create your personalized plan.
        </p>

        <button 
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="ob-btn-lime"
          style={{ padding: '14px', width: '100%', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.846-5.834c-2.42 0-4.154-1.884-4.154-4.166 0-2.28 1.734-4.166 4.154-4.166 1.107 0 2.115.434 2.87 1.155l-1.4 1.34c-.29-.283-.815-.653-1.47-.653-1.42 0-2.584 1.185-2.584 2.65 0 1.464 1.166 2.648 2.585 2.648 1.637 0 2.228-1.173 2.325-1.78H10.15v-1.784h4.11c.046.223.064.444.064.693 0 2.383-1.614 4.063-4.17 4.063z" clipRule="evenodd"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>
      </div>
    </div>
  );
}
