import { STEPS } from "@/lib/constants";

export function StepProgress({ step }: { step: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Track */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {STEPS.map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        {i > 0 && <div style={{ flex: 1, height: 1, background: i <= step ? 'var(--lime)' : 'var(--border-hi)', transition: 'background 0.4s' }} />}
                        <div className={`ob-step-dot${i <= step ? ' done' : ''}`} />
                        {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? 'var(--lime)' : 'var(--border-hi)', transition: 'background 0.4s' }} />}
                    </div>
                ))}
            </div>
            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lime)' }}>
                        {STEPS[step].key}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{STEPS[step].sub}</p>
                </div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>{step + 1}/{STEPS.length}</span>
            </div>
        </div>
    );
}