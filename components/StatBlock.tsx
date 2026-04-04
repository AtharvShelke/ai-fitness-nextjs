// ─── Stat block (responsive grid item) ───────────────────────────────────────

export function StatBlock({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
    return (
        <div className="stat-block">
            {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--lime)', boxShadow: '0 0 12px rgba(200,241,53,0.6)' }} />}
            <p className="section-label">{label}</p>
            <p className="ob-stat-num ob-num-in" style={{ fontSize: 28, color: accent ? 'var(--lime)' : 'var(--ink)', textShadow: accent ? '0 0 20px rgba(200,241,53,0.3)' : 'none' }}>
                {value}
            </p>
            {sub && <p style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{sub}</p>}
        </div>
    );
}
