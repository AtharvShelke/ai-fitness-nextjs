
// ─── Advisory ────────────────────────────────────────────────────────────────

export function Advisory({ items }: { items: string[] }) {
    if (!items.length) return null;
    return (
        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--amber)' }}>
            <span style={{ color: 'var(--amber)', fontSize: 13, flexShrink: 0, marginTop: 1 }}>△</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <p className="section-label" style={{ color: 'var(--amber)', marginBottom: 4 }}>Advisory</p>
                {items.map((w, i) => <p key={i} style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>{w}</p>)}
            </div>
        </div>
    );
}