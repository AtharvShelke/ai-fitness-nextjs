// components/FormShell.tsx — UPDATED: now drives 4 steps

import { useState } from "react";
import { StepProgress } from "./StepProgress";
import { Step1, Step2, Step3, Step4 } from "./Steps";
import { STEPS } from "../lib/constants";

export function Form({ onGenerate, loading }: {
    onGenerate: (d: Record<string, string>, t: 'workout' | 'diet') => void;
    loading: boolean;
}) {
    const [step, setStep] = useState(0);
    const [ft, setFt] = useState<'workout' | 'diet'>('workout');
    const [d, setD] = useState<Record<string, string>>({});
    const s = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['workout', 'diet'] as const).map((val) => (
                    <button
                        key={val}
                        onClick={() => { setFt(val); setStep(0); }}
                        style={{
                            padding: '13px 8px',
                            fontFamily: "'Barlow Condensed',sans-serif",
                            fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                            background: ft === val ? 'var(--lime)' : 'var(--bg-5)',
                            color: ft === val ? '#07080A' : 'var(--ink-3)',
                            border: ft === val ? '1px solid transparent' : '1px solid var(--border-hi)',
                            cursor: 'pointer',
                            transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            minHeight: 48,
                            borderRadius: 0,
                            boxShadow: 'none',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            {val === 'workout' ? (
                                <span style={{ fontFamily: "'DM Mono', monospace", color: ft === val ? '#07080A' : 'var(--lime)', fontSize: 16 }}>//</span>
                            ) : (
                                <span style={{ fontFamily: "'DM Mono', monospace", color: ft === val ? '#07080A' : 'var(--lime)', fontSize: 16 }}>::</span>
                            )}
                        </span>
                        {val === 'workout' ? 'TRAINING' : 'NUTRITION'}
                    </button>
                ))}
            </div>

            <StepProgress step={step} />

            <div style={{ minHeight: 220 }}>
                {step === 0 && <Step1 d={d} set={s} />}
                {step === 1 && <Step2 d={d} set={s} />}
                {step === 2 && <Step3 d={d} set={s} ft={ft} />}
                {step === 3 && <Step4 d={d} set={s} ft={ft} />}
            </div>


            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {step > 0 && (
                    <button
                        className="ob-btn-ghost"
                        onClick={() => setStep(p => p - 1)}
                        style={{ padding: '0 18px', height: 54, flexShrink: 0, borderRadius: 0, fontFamily: "'DM Mono', monospace" }}
                    >
                        {'< BACK'}
                    </button>
                )}
                {step < STEPS.length - 1 ? (
                    <button
                        className="ob-btn-ghost"
                        onClick={() => setStep(p => p + 1)}
                        style={{ flex: 1, height: 54, borderRadius: 0, border: '1px solid var(--lime)', color: 'var(--lime)' }}
                    >
                        NEXT STEP  {'>'}
                    </button>
                ) : (
                    <button
                        className="ob-btn-lime"
                        onClick={() => onGenerate(d, ft)}
                        disabled={loading}
                        style={{ flex: 1, borderRadius: 0 }}
                    >
                        {loading
                            ? 'GENERATING YOUR PLAN...'
                            : `GENERATE ${ft === 'workout' ? 'TRAINING' : 'NUTRITION'} PLAN`
                        }
                    </button>
                )}
            </div>
        </div>



    );
}