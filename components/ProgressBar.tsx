// ── Progress bar component ──────────────────────────────────────────────────



export const ProgressBar = ({ progress }: { progress: GenProgress | null }) => {
    if (!progress || progress.status === 'complete') return null;
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
        generating: { label: 'BUILDING YOUR PLAN', color: 'var(--lime)', bg: 'var(--lime-dim)' },
        validating: { label: 'VALIDATING', color: 'var(--blue)', bg: 'rgba(77,166,255,0.1)' },
        recovering: { label: 'RECOVERING UNITS', color: 'var(--amber)', bg: 'rgba(255,176,32,0.1)' },
        complete: { label: 'COMPLETE', color: 'var(--lime)', bg: 'var(--lime-dim)' },
        error: { label: 'ERROR', color: 'var(--red)', bg: 'rgba(255,68,68,0.1)' },
    };

    const cfg = statusConfig[progress.status] || statusConfig.generating;

    return (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: cfg.color,
                        boxShadow: `0 0 8px ${cfg.color}`,
                        animation: progress.status === 'error' ? 'none' : 'ob-pulse-dot 1s ease-in-out infinite',
                    }} />
                    <span style={{
                        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.18em', color: cfg.color,
                    }}>
                        {cfg.label}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>
                        {progress.done}/{progress.total}
                    </span>
                    <span style={{
                        fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700,
                        color: cfg.color, letterSpacing: '0.05em',
                        background: cfg.bg,
                        padding: '2px 6px', borderRadius: 2,
                    }}>
                        {pct}%
                    </span>
                </div>
            </div>

            {/* Progress track */}
            <div style={{ height: 4, background: 'var(--bg-4)', overflow: 'hidden', borderRadius: 4 }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: progress.status === 'recovering'
                        ? `linear-gradient(90deg, var(--amber), #FFD060)`
                        : `linear-gradient(90deg, var(--lime), #90FF00)`,
                    transition: 'width 0.35s cubic-bezier(0.16,1,0.3,1)',
                    borderRadius: 4,
                }} />
            </div>

            {/* Unit chips */}
            {progress.units.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                    {progress.units.map((u, i) => (
                        <span key={i} className="ob-badge" style={{
                            background: 'var(--lime-dim)', color: 'var(--lime)',
                            border: '1px solid rgba(202,255,60,0.18)', fontSize: 9,
                            animation: 'ob-fade-in 0.3s ease',
                        }}>
                            {u}
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: 3 }}>
                                <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};