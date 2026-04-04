// ─── Form shell ───────────────────────────────────────────────────────────────

import { useState } from "react";
import { StepProgress } from "./StepProgress";
import { Step1, Step2, Step3 } from "./Steps";
import { STEPS } from "../lib/constants";
export function Form({ onGenerate, loading }: { onGenerate: (d: Record<string, string>, t: 'workout' | 'diet') => void; loading: boolean }) {
    const [step, setStep] = useState(0);
    const [ft, setFt] = useState<'workout' | 'diet'>('workout');
    const [d, setD] = useState<Record<string, string>>({});
    const s = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

            {/* Protocol type toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {(['workout', 'diet'] as const).map((val) => (
                    <button key={val} onClick={() => { setFt(val); setStep(0); }}
                        style={{
                            padding: '14px 8px',
                            fontFamily: "'Barlow Condensed',sans-serif",
                            fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                            background: ft === val ? 'var(--lime)' : 'var(--bg-3)',
                            color: ft === val ? 'var(--bg)' : 'var(--ink-3)',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            minHeight: 48,
                        }}>
                        <span style={{ fontSize: 15, opacity: ft === val ? 1 : 0.4 }}>{val === 'workout' ? '⬡' : '◈'}</span>
                        {val === 'workout' ? 'TRAINING' : 'NUTRITION'}
                    </button>
                ))}
            </div>

            <StepProgress step={step} />

            {/* Step content */}
            <div style={{ minHeight: 220 }}>
                {step === 0 && <Step1 d={d} set={s} />}
                {step === 1 && <Step2 d={d} set={s} />}
                {step === 2 && <Step3 d={d} set={s} ft={ft} />}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {step > 0 && (
                    <button className="ob-btn-ghost" onClick={() => setStep(p => p - 1)} style={{ padding: '0 16px', height: 52, flexShrink: 0 }}>
                        ← BACK
                    </button>
                )}
                {step < STEPS.length - 1 ? (
                    <button className="ob-btn-ghost" onClick={() => setStep(p => p + 1)} style={{ flex: 1, height: 52 }}>
                        CONTINUE →
                    </button>
                ) : (
                    <button className="ob-btn-lime" onClick={() => onGenerate(d, ft)} disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'GENERATING…' : `GENERATE ${ft === 'workout' ? 'TRAINING' : 'NUTRITION'} PROTOCOL`}
                    </button>
                )}
            </div>
        </div>
    );
}