// ─── Form shell ───────────────────────────────────────────────────────────────

import { useState } from "react";
import { StepProgress } from "./StepProgress";
import { Step1, Step2, Step3 } from "./Steps";
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

            {/* Protocol type toggle */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            }}>
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
                            borderRadius: 3,
                            boxShadow: ft === val ? '0 4px 20px rgba(202,255,60,0.2)' : 'none',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            {val === 'workout' ? (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 1.5L9.5 5.5H12L9.5 9H11.5L7 12.5L2.5 9H4.5L2 5.5H4.5L7 1.5Z"
                                        fill={ft === val ? '#07080A' : 'var(--lime)'} opacity={ft === val ? 1 : 0.7} />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <circle cx="7" cy="7" r="5" stroke={ft === val ? '#07080A' : '#CAFF3C'} strokeWidth="1" opacity="0.8" />
                                    <path d="M5 7C5 5.9 5.9 5 7 5" stroke={ft === val ? '#07080A' : '#CAFF3C'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                                    <path d="M5 7.5L6.5 9L9 6" stroke={ft === val ? '#07080A' : '#CAFF3C'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </span>
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
                    <button
                        className="ob-btn-ghost"
                        onClick={() => setStep(p => p - 1)}
                        style={{ padding: '0 18px', height: 54, flexShrink: 0, borderRadius: 3 }}
                    >
                        ← BACK
                    </button>
                )}
                {step < STEPS.length - 1 ? (
                    <button
                        className="ob-btn-ghost"
                        onClick={() => setStep(p => p + 1)}
                        style={{ flex: 1, height: 54, borderRadius: 3 }}
                    >
                        NEXT STEP →
                    </button>
                ) : (
                    <button
                        className="ob-btn-lime"
                        onClick={() => onGenerate(d, ft)}
                        disabled={loading}
                        style={{ flex: 1 }}
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