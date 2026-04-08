// ─── Generating state ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function Generating() {
    const [dot, setDot] = useState(0);
    const msgs = ['ANALYZING BIOMETRICS', 'CALCULATING TDEE', 'GENERATING PLAN', 'CALIBRATING LOAD', 'OPTIMIZING SCHEDULE'];
    useEffect(() => {
        const id = setInterval(() => setDot(d => (d + 1) % msgs.length), 1800);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '72px 20px', minHeight: 360 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', inset: 0 }}>
                    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="var(--border-hi)" strokeWidth="1" />
                    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="var(--lime)" strokeWidth="1.5" strokeDasharray="220" strokeLinecap="round"
                        style={{ animation: 'loader-dash 2s linear infinite', filter: 'drop-shadow(0 0 6px var(--lime))' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, background: 'var(--lime)', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', animation: 'spin-slow 3s linear infinite', boxShadow: '0 0 12px var(--lime)' }} />
                </div>
            </div>
            <div style={{ textAlign: 'center', minHeight: 56 }}>
                <div key={dot} className="ob-fade" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: '0.12em', color: 'var(--lime)', marginBottom: 6, textShadow: '0 0 20px rgba(200,241,53,0.4)' }}>
                    {msgs[dot]}
                </div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 14 }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ height: 1, background: 'var(--lime)', animation: `breathe-lime 1.6s ease-in-out ${i * 0.25}s infinite` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}