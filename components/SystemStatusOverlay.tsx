'use client';

import { useState, useEffect } from 'react';

export function SystemStatusOverlay() {
  const [isVisible, setIsVisible] = useState(true);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  useEffect(() => {
    const handleActive = (e: any) => setActiveModel(e.detail);
    const handleClear = () => setActiveModel(null);

    window.addEventListener('model-active', handleActive);
    window.addEventListener('model-cleared', handleClear);

    return () => {
      window.removeEventListener('model-active', handleActive);
      window.removeEventListener('model-cleared', handleClear);
    };
  }, []);

  const m1 = "gemini-2.5-flash";
  const m2 = "gemini-3-flash-preview";
  const m3 = "gemma-4-31b-it";

  const getStyle = (m: string) => {
    return activeModel === m
      ? { color: 'var(--lime)', fontWeight: 600, textShadow: '0 0 10px rgba(200,241,53,0.3)' }
      : { color: activeModel ? 'var(--ink-3)' : 'var(--ink)', fontWeight: 400, opacity: activeModel ? 0.3 : 1 };
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
    }}>
      <div style={{
        background: 'rgba(8,8,9,0.88)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        border: '1px solid var(--border)',
        padding: '16px',
        borderRadius: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: 280,
        position: 'relative',
      }}>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'none',
            border: 'none',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-3)'}
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: activeModel ? 'var(--lime)' : 'var(--ink-3)',
            boxShadow: activeModel ? '0 0 8px var(--lime)' : 'none',
            animation: activeModel ? 'pulse-dot 2s infinite' : 'none',
            marginTop: 6,
            flexShrink: 0,
            transition: 'all 0.3s ease'
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: activeModel ? 'var(--lime)' : 'var(--ink-2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              transition: 'color 0.3s ease'
            }}>
              LLM Engines Status
            </span>
            <span style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 13,
              letterSpacing: '0.02em',
              lineHeight: 1.4,
              transition: 'all 0.3s ease',
              ...getStyle(m1)
            }}>
              {m1} <span style={{ fontSize: 11 }}>(~40s)</span>
            </span>
            <span style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 12,
              lineHeight: 1.4,
              transition: 'all 0.3s ease',
              ...getStyle(m2)
            }}>
              fallback 1: {m2} <span style={{ fontSize: 11 }}>(~60s)</span>
            </span>
            {/* <span style={{
              fontFamily: "'Barlow', sans-serif",
              fontSize: 12,
              lineHeight: 1.4,
              transition: 'all 0.3s ease',
              ...getStyle(m3)
            }}>
              fallback 2: {m3} <span style={{ fontSize: 11 }}>(~4m)</span>
            </span> */}

            <div style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
              fontFamily: "'Barlow', sans-serif",
              fontSize: 12,
              color: 'var(--ink-3)',
              lineHeight: 1.4,
            }}>
              Due to the deep reasoning and personalized multi-step processing required to build elite performance protocols, generation times are longer than typical queries.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
