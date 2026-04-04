// ─── Macro bar ────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function MacroBar({ label, g, pct, color }: { label: string; g: string; pct: number; color: string }) {
    const [w, setW] = useState(0);
    useEffect(() => { const t = setTimeout(() => setW(pct), 200); return () => clearTimeout(t); }, [pct]);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color }}>{g} · {pct}%</span>
            </div>
            <div className="macro-track">
                <div className="macro-fill" style={{ width: `${w}%`, background: color }} />
            </div>
        </div>
    );
}
