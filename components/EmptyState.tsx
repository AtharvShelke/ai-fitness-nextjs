
// ─── Empty state ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function EmptyState() {
    const [frame, setFrame] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setFrame(f => (f + 1) % 3), 700);
        return () => clearInterval(id);
    }, []);

    const dots = ['●', '●●', '●●●'];

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 28, padding: '56px 24px', minHeight: 360, textAlign: 'center',
        }}>
            {/* Dumbbell icon */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border-hi)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(202,255,60,0.06)',
                }}>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M5 13H7V19H5V13Z" fill="var(--lime)" opacity="0.8" />
                        <path d="M3 14.5H6V17.5H3V14.5Z" fill="var(--lime)" opacity="0.8" />
                        <path d="M25 13H27V19H25V13Z" fill="var(--lime)" opacity="0.8" />
                        <path d="M26 14.5H29V17.5H26V14.5Z" fill="var(--lime)" opacity="0.8" />
                        <path d="M7 15H25V17H7V15Z" fill="var(--lime)" opacity="0.4" />
                    </svg>
                </div>
                {/* Outer glow ring */}
                <div style={{
                    position: 'absolute', inset: -8, borderRadius: '50%',
                    border: '1px solid rgba(202,255,60,0.12)',
                    animation: 'ob-pulse-ring 2.5s ease-in-out infinite',
                }} />
            </div>

            <div>
                <h2 style={{
                    fontFamily: "'Bebas Neue',sans-serif",
                    fontSize: 30, letterSpacing: '0.08em', color: 'var(--ink)',
                    marginBottom: 10, lineHeight: 1.1,
                }}>
                    READY TO CRUSH IT?
                </h2>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 280, lineHeight: 1.8, margin: '0 auto' }}>
                    Complete the form on the left to generate your personalized training &amp; nutrition protocol.
                </p>
            </div>

            {/* Animated waiting indicator */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px',
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 4,
            }}>
                <span style={{ fontSize: 13, color: 'var(--lime)', letterSpacing: '0.05em', minWidth: 20 }}>
                    {dots[frame]}
                </span>
                <span style={{
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.16em',
                    textTransform: 'uppercase', color: 'var(--ink-3)',
                }}>
                    Awaiting your profile
                </span>
            </div>

            {/* Hint stats */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                    {
                        icon: (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1L8 4.5H10.5L8.5 7H10L6 11L2 7H3.5L1.5 4.5H4L6 1Z" fill="var(--lime)" opacity="0.8" />
                            </svg>
                        ),
                        text: 'Workout plan'
                    },
                    {
                        icon: (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="4" stroke="var(--lime)" strokeWidth="1" opacity="0.8" />
                                <path d="M4 6C4 4.9 4.9 4 6 4" stroke="var(--lime)" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                                <path d="M4 6L5.5 7.5L8 4.5" stroke="var(--lime)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                            </svg>
                        ),
                        text: 'Meal plan'
                    },
                    {
                        icon: (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <rect x="1" y="7" width="2" height="4" fill="var(--lime)" opacity="0.5" />
                                <rect x="5" y="4" width="2" height="7" fill="var(--lime)" opacity="0.7" />
                                <rect x="9" y="2" width="2" height="9" fill="var(--lime)" opacity="0.9" />
                            </svg>
                        ),
                        text: 'Macro targets'
                    },
                ].map((item, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, color: 'var(--ink-3)',
                        fontFamily: "'Barlow Condensed',sans-serif",
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                        {item.icon}
                        <span>{item.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}