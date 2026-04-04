// ─── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return <button className={`ob-chip${active ? ' on' : ''}`} onClick={onClick}>{label}</button>;
}
