// ─── Diet output ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Advisory } from "./Advisory";
import { MacroBar } from "./Macrobar";

export function DietOut({ plan }: { plan: DietPlan }) {
    const [tab, setTab] = useState<'meals' | 'supplements' | 'avoid' | 'tips'>('meals');
    const [open, setOpen] = useState<number | null>(null);
    const { summary: s, meals, supplements, avoidFoods, weeklyVariation: wv, warnings, tips } = plan;

    const p = parseInt(s.protein) || 0, c = parseInt(s.carbs) || 0, f = parseInt(s.fats) || 0;
    const tot = (p * 4) + (c * 4) + (f * 9);
    const pp = tot > 0 ? Math.round((p * 4 / tot) * 100) : 0;
    const cp = tot > 0 ? Math.round((c * 4 / tot) * 100) : 0;
    const fp = tot > 0 ? Math.round((f * 9 / tot) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }} className="ob-slide-l">
            <Advisory items={warnings} />

            {/* Caloric hero */}
            <div className="cal-hero">
                {/* Ghost BG number — desktop only decoration */}
                <div style={{ position: 'absolute', right: -10, top: -10, fontFamily: "'Bebas Neue',sans-serif", fontSize: 140, lineHeight: 1, color: 'rgba(200,241,53,0.03)', pointerEvents: 'none', userSelect: 'none' }}>
                    {s.dailyCalories}
                </div>
                <div style={{ position: 'relative' }}>
                    <p className="section-label" style={{ marginBottom: 8 }}>DAILY CALORIC TARGET</p>
                    <p className="ob-stat-num ob-num-in" style={{ fontSize: 'clamp(44px,8vw,60px)', color: 'var(--lime)', textShadow: '0 0 30px rgba(200,241,53,0.25)' }}>
                        {s.dailyCalories}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>kcal / day</span>
                        <span style={{ color: 'var(--border-hi)' }}>·</span>
                        <span style={{ fontSize: 12, color: 'var(--lime)', opacity: 0.8 }}>{s.hydration}</span>
                        <span style={{ color: 'var(--border-hi)' }}>·</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{s.dietLabel}</span>
                    </div>
                </div>
                <div style={{ position: 'relative', marginTop: 0 }}>
                    <p className="section-label" style={{ marginBottom: 8 }}>MACROS</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: 'var(--ink-2)', lineHeight: 2 }}>
                        <span style={{ color: 'var(--lime)' }}>P</span> {s.protein}{'  '}
                        <span style={{ color: 'var(--amber)' }}>C</span> {s.carbs}{'  '}
                        <span style={{ color: '#60A5FA' }}>F</span> {s.fats}
                    </p>
                </div>
            </div>

            {/* Macro bars */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--border)' }}>
                <MacroBar label="Protein" g={s.protein} pct={pp} color="var(--lime)" />
                <MacroBar label="Carbohydrates" g={s.carbs} pct={cp} color="var(--amber)" />
                <MacroBar label="Fats" g={s.fats} pct={fp} color="#60A5FA" />
            </div>

            {/* Tabs */}
            <div className="ob-tabs">
                {(['meals', 'supplements', 'avoid', 'tips'] as const).map(t => (
                    <button key={t} className={`ob-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
                ))}
            </div>

            <div style={{ padding: '14px 0' }}>

                {/* MEALS — now flat, one item per meal slot */}
                {tab === 'meals' && (
                    <div className="ob-fade" style={{ display: 'flex', flexDirection: 'column' }}>
                        {meals.map((m, i) => (
                            <div key={i} className={`ob-row${open === i ? ' open' : ''}`} style={{ marginTop: i > 0 ? -1 : 0 }}>
                                <button onClick={() => setOpen(open === i ? null : i)}
                                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 14px', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 52 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, width: 34 }}>
                                            <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--lime)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                                {m.meal.slice(0, 3)}
                                            </p>
                                            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--ink-3)' }}>{m.time}</p>
                                        </div>
                                        <div style={{ width: 1, height: 26, background: 'var(--border-hi)', flexShrink: 0 }} />
                                        <p style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.meal}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 10 }}>
                                        {m.calories > 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>{m.calories} kcal</span>}
                                        <svg width="10" height="6" viewBox="0 0 10 6" style={{ transition: 'transform 0.22s', transform: open === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                                            <path d="M1 1l4 4 4-4" stroke="var(--ink-3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </button>

                                {open === i && (
                                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 14px' }} className="ob-fade">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div>
                                                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{m.name}</p>
                                                <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>{m.prepMins} min prep</p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {[[`${m.calories} kcal`, 'var(--ink-2)'], [`P ${m.protein}`, 'var(--lime)'], [`C ${m.carbs}`, 'var(--amber)'], [`F ${m.fats}`, '#60A5FA']].map(([l, c]) => (
                                                    <span key={l} className="ob-badge" style={{ background: `${c}14`, color: c as string, border: `1px solid ${c}28` }}>{l}</span>
                                                ))}
                                            </div>
                                            {m.ingredients.length > 0 && (
                                                <div>
                                                    <p className="section-label" style={{ marginBottom: 8 }}>Ingredients</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                        {m.ingredients.map((ing, j) => (
                                                            <span key={j} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--ink-3)' }}>{ing}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Weekly variation */}
                        {(wv.refeedDay || wv.lowCarbDay) && (
                            <div style={{ marginTop: 12, border: '1px solid var(--border)', padding: '14px', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 150, padding: '0 14px 0 0' }}>
                                    <p className="section-label" style={{ marginBottom: 5 }}>Refeed Day</p>
                                    <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{wv.refeedDay}</p>
                                </div>
                                <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 150, padding: '0 0 0 14px' }}>
                                    <p className="section-label" style={{ marginBottom: 5 }}>Low-Carb Day</p>
                                    <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{wv.lowCarbDay}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SUPPLEMENTS */}
                {tab === 'supplements' && (
                    <div className="ob-fade" style={{ display: 'flex', flexDirection: 'column' }}>
                        {supplements.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '48px 0' }}>No supplements recommended for your profile.</p>
                        ) : supplements.map((sup, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{sup.name}</p>
                                    <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>{sup.timing}</p>
                                </div>
                                <span className="ob-badge" style={{ background: 'var(--lime-dim)', color: 'var(--lime)', border: '1px solid rgba(200,241,53,0.2)', flexShrink: 0 }}>{sup.dose}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* AVOID */}
                {tab === 'avoid' && (
                    <div className="ob-fade" style={{ display: 'flex', flexDirection: 'column' }}>
                        {avoidFoods.map((food, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)', borderLeft: '2px solid rgba(255,64,64,0.3)' }}>
                                <span style={{ color: 'var(--red)', opacity: 0.5, fontSize: 10, marginTop: 2 }}>✕</span>
                                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{food}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* TIPS */}
                {tab === 'tips' && (
                    <div className="ob-fade">
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: 'flex', gap: 16, padding: '14px', borderBottom: '1px solid var(--border)' }}>
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
