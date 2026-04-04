// ─── Workout output ───────────────────────────────────────────────────────────

import { useState } from "react";
import { StatBlock } from "./StatBlock";
import { Advisory } from "./Advisory";

export function WorkoutOut({ plan }: { plan: WorkoutPlan }) {
    const [tab, setTab] = useState<'schedule' | 'warmup' | 'progress' | 'tips'>('schedule');
    const [open, setOpen] = useState<number | null>(null);
    const { summary: s, weeklySchedule: ws, warmup, cooldown, progressionPlan: pp, warnings, tips } = plan;
    const bmiColor = ({ Normal: 'var(--lime)', Underweight: '#60A5FA', Overweight: 'var(--amber)', Obese: 'var(--red)' } as Record<string, string>)[s.bmiCategory] ?? 'var(--ink-2)';

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }} className="ob-slide-l">
            <Advisory items={warnings} />

            {/* Stats — 2×2 mobile, 4-col desktop via CSS class */}
            <div className="stat-grid">
                <StatBlock label="BMI" value={s.bmi.toFixed(1)} sub={s.bmiCategory} accent />
                <StatBlock label="BMR" value={String(s.bmr)} sub="kcal at rest" />
                <StatBlock label="TDEE" value={String(s.tdee)} sub="daily expenditure" />
                <StatBlock label="Target" value={String(s.recommendedCalories)} sub="kcal / day" />
            </div>

            {/* Level + BMI badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', flexWrap: 'wrap', gap: 8 }}>
                <span className="section-label">FITNESS LEVEL — {s.fitnessLevel}</span>
                <span className="ob-badge" style={{ background: `${bmiColor}18`, color: bmiColor, border: `1px solid ${bmiColor}30` }}>{s.bmiCategory}</span>
            </div>

            {/* Tabs */}
            <div className="ob-tabs">
                {(['schedule', 'warmup', 'progress', 'tips'] as const).map(t => (
                    <button key={t} className={`ob-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                        {t === 'warmup' ? 'WARM-UP' : t === 'progress' ? 'PROGRESSION' : t.toUpperCase()}
                    </button>
                ))}
            </div>

            <div style={{ padding: '14px 0' }}>

                {/* SCHEDULE */}
                {tab === 'schedule' && (
                    <div className="ob-fade" style={{ display: 'flex', flexDirection: 'column' }}>
                        {ws.map((day, i) => (
                            <div key={i} className={`ob-row${open === i ? ' open' : ''}`} style={{ marginTop: i > 0 ? -1 : 0 }}>
                                <button
                                    onClick={() => day.type === 'training' && setOpen(open === i ? null : i)}
                                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 14px', background: 'transparent', border: 'none', cursor: day.type === 'training' ? 'pointer' : 'default', minHeight: 52 }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)', width: 30, letterSpacing: '0.08em', flexShrink: 0 }}>{day.day.slice(0, 3).toUpperCase()}</span>
                                        <div style={{ width: 1, height: 14, background: 'var(--border-hi)', flexShrink: 0 }} />
                                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 600, color: day.type === 'rest' ? 'var(--ink-3)' : 'var(--ink)', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {day.focus}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 10 }}>
                                        {day.type !== 'rest' && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>{day.durationMinutes}m</span>}
                                        <span className="ob-badge" style={
                                            day.type === 'training' ? { background: 'var(--lime-dim)', color: 'var(--lime)', border: '1px solid rgba(200,241,53,0.2)' }
                                                : day.type === 'active_recovery' ? { background: 'rgba(96,165,250,0.08)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)' }
                                                    : { background: 'var(--bg-3)', color: 'var(--ink-3)', border: '1px solid var(--border)' }
                                        }>
                                            {day.type === 'training' ? 'TRAIN' : day.type === 'active_recovery' ? 'ACTIVE' : 'REST'}
                                        </span>
                                        {day.type === 'training' && (
                                            <svg width="10" height="6" viewBox="0 0 10 6" style={{ transition: 'transform 0.22s', transform: open === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                                                <path d="M1 1l4 4 4-4" stroke="var(--ink-3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                            </svg>
                                        )}
                                    </div>
                                </button>

                                {open === i && day.exercises.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--border)' }} className="ob-fade">
                                        <div className="ob-table-wrap">
                                            <table className="ob-table">
                                                <thead>
                                                    <tr>
                                                        <th>Exercise</th>
                                                        <th className="center">Sets</th>
                                                        <th className="center">Reps</th>
                                                        <th className="center">Rest</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {day.exercises.map((ex, j) => (
                                                        <tr key={j}>
                                                            <td>
                                                                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{ex.name}</div>
                                                                <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em', marginTop: 2 }}>{ex.muscle}</div>
                                                            </td>
                                                            <td className="center" style={{ fontFamily: "'DM Mono',monospace", color: 'var(--lime)', fontSize: 15 }}>{ex.sets}</td>
                                                            <td className="center" style={{ fontFamily: "'DM Mono',monospace" }}>{ex.reps}</td>
                                                            <td className="center" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>{ex.rest}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* WARM-UP */}
                {tab === 'warmup' && (
                    <div className="warmup-grid ob-fade" style={{ padding: '0' }}>
                        {[{ title: 'WARM-UP', items: warmup, color: 'var(--amber)' }, { title: 'COOL-DOWN', items: cooldown, color: '#60A5FA' }].map(sec => (
                            <div key={sec.title} style={{ border: '1px solid var(--border)' }}>
                                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 2, height: 12, background: sec.color, flexShrink: 0 }} />
                                    <p className="section-label" style={{ color: sec.color }}>{sec.title}</p>
                                </div>
                                {sec.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderBottom: i < sec.items.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)' }}>
                                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: sec.color, minWidth: 18, marginTop: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                                        <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* PROGRESSION */}
                {tab === 'progress' && (
                    <div className="ob-fade" style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                            { label: 'WEEKS 1–2', phase: 'ADAPTATION', desc: pp.week1_2 },
                            { label: 'WEEKS 3–4', phase: 'PROGRESSION', desc: pp.week3_4 },
                            { label: 'WEEKS 5–6', phase: 'PEAK LOAD', desc: pp.week5_6 },
                        ].map((p, i) => (
                            <div key={i} className="progress-row">
                                <div className="progress-label">
                                    <p className="ob-stat-num" style={{ fontSize: 18, color: 'var(--lime)' }}>{p.label}</p>
                                    <span className="ob-badge" style={{ background: 'var(--lime-dim)', color: 'var(--lime)', border: '1px solid rgba(200,241,53,0.18)', alignSelf: 'flex-start' }}>{p.phase}</span>
                                </div>
                                <div className="progress-desc">
                                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.75 }}>{p.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TIPS */}
                {tab === 'tips' && (
                    <div className="ob-fade">
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 14px', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--lime)', minWidth: 20, marginTop: 2, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.7 }}>{tip}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
