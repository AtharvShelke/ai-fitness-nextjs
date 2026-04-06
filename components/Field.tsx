// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({ label, hint, ...rest }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="field-label">{label}</label>
                {hint && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--lime)', opacity: 0.6 }}>{hint}</span>}
            </div>
            <input className="ob-input" {...rest} />
        </div>
    );
}
