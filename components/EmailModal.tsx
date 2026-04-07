import { useState, useEffect } from 'react';

export function EmailModal({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('verifiedEmail');
    if (stored) {
      onVerified(stored);
    }
  }, [onVerified]);

  if (!mounted || localStorage.getItem('verifiedEmail')) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/email/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        if (data.code === 'LIMIT_REACHED') {
          setLimitReached(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to verify email');
      }

      localStorage.setItem('verifiedEmail', email);
      onVerified(email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5, 5, 5, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--border)',
        padding: '32px', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        textAlign: limitReached ? 'center' : 'left'
      }}>
        {limitReached ? (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: 20 }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, lineHeight: 1, marginBottom: 12, color: 'var(--ink)' }}>
              LIMIT REACHED
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 24 }}>
              You've successfully generated both your AI workout and diet plans. To maintain system quality and prevent abuse, current accounts are limited.
            </p>
            <div style={{ padding: '12px', background: 'rgba(202, 255, 60, 0.05)', border: '1px solid var(--lime-dim)', borderRadius: 4, marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--lime)', margin: 0 }}>
                Wait for our next major update to access premium upgrades and generate unlimited specific plans!
              </p>
            </div>
            <button 
              onClick={() => { setLimitReached(false); setEmail(''); }}
              className="ob-btn-ghost"
              style={{ padding: '12px', width: '100%', height: 'auto' }}
            >
              USE A DIFFERENT EMAIL
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 6, height: 6, background: 'var(--lime)', boxShadow: '0 0 10px var(--lime)', animation: 'ob-pulse-ring 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--lime)', textTransform: 'uppercase' }}>
                EARLY ACCESS
              </span>
            </div>
            
            <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, lineHeight: 1, marginBottom: 12, color: 'var(--ink)' }}>
              ENTER YOUR EMAIL
            </h2>
            
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 24 }}>
              To prevent abuse, we currently limit AI protocol generation to one plan per person. Enter your email to begin.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: 'var(--ink)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
                  fontFamily: "'Inter', sans-serif"
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--lime)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              />
              
              {error && (
                <div style={{ padding: '8px 12px', borderLeft: '2px solid var(--red)', background: 'rgba(255,64,64,0.06)', fontSize: 12, color: '#FF8080' }}>
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="ob-btn-lime"
                disabled={loading}
                style={{ padding: '12px', height: 'auto', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'VERIFYING...' : 'CONTINUE'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
