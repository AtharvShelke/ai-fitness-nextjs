
// ─── Empty state ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function EmptyState() {
    const [tick, setTick] = useState(0);
    useEffect(() => { const id = setInterval(() => setTick(t => (t + 1) % 25), 500); return () => clearInterval(id); }, []);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '56px 16px', minHeight: 340 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {Array(25).fill(null).map((_, i) => (
                    <div key={i} style={{ width: 4, height: 4, background: i === tick ? 'var(--lime)' : 'var(--bg-4)', transition: 'background 0.3s', boxShadow: i === tick ? '0 0 6px var(--lime)' : 'none' }} />
                ))}
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: '0.1em', color: 'var(--ink)', marginBottom: 10 }}>
                    AWAITING YOUR DATA
                </p>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 260, lineHeight: 1.8, margin: '0 auto' }}>
                    Complete the form to generate your personalised performance protocol.
                </p>
            </div>
        </div>
    );
}