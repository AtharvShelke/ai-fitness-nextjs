import { useState, useEffect } from 'react';

export function EmailModal({ onVerified }: { onVerified: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

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
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
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
      </div>
    </div>
  );
}
