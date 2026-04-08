// components/Steps.tsx — UPDATED: 4 steps with all new input fields

import {
    DIETS, GOALS,
    FITNESS_LEVELS, ACTIVITY_LEVELS, TRAINING_LOCATIONS,
    STRESS_LEVELS, SLEEP_OPTIONS, TIMELINE_OPTIONS, SESSION_DURATIONS,
} from "@/lib/constants";
import { Chip } from "./Chip";
import { Field } from "./Field";

// ─── Step 1: Biometrics (unchanged fields) ────────────────────────────────────
export function Step1({ d, set }: { d: Record<string, string>; set: (k: string, v: string) => void }) {
    return (
        <div className="fields-2col ob-fade">
            <Field label="Height" placeholder="cm" type="number" hint="e.g. 175" value={d.height || ''} onChange={e => set('height', e.target.value)} />
            <Field label="Weight" placeholder="kg" type="number" hint="e.g. 72" value={d.weight || ''} onChange={e => set('weight', e.target.value)} />
            <Field label="Age" placeholder="years" type="number" value={d.age || ''} onChange={e => set('age', e.target.value)} />
            <Field label="Sex" placeholder="Male / Female / Other" value={d.gender || ''} onChange={e => set('gender', e.target.value)} />
        </div>
    );
}

// ─── Step 2: Objectives ────────────────────────────────────────────────────────
export function Step2({ d, set }: { d: Record<string, string>; set: (k: string, v: string) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">
            {/* Primary goal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>[ PRIMARY GOAL ]</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {GOALS.map(g => <Chip key={g} label={g} active={d.goal === g} onClick={() => set('goal', g)} />)}
                </div>
            </div>

            {/* Target weight + timeline side by side */}
            <div className="fields-2col">
                <Field label="Target Weight" placeholder="kg (optional)" hint="optional"
                    value={d.targetWeight || ''} onChange={e => set('targetWeight', e.target.value)} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <p className="field-label">Timeline</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {TIMELINE_OPTIONS.map(t => (
                            <button key={t} className={`ob-chip${d.timeline === t ? ' on' : ''}`}
                                style={{ padding: '8px 10px', fontSize: 11 }}
                                onClick={() => set('timeline', t)}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Health conditions */}
            <Field label="Health Conditions / Injuries" placeholder="e.g. lower back pain, hypertension" hint="optional"
                value={d.healthConditions || ''} onChange={e => set('healthConditions', e.target.value)} />
        </div>
    );
}

// ─── Step 3: Training config ──────────────────────────────────────────────────
export function Step3({ d, set, ft }: { d: Record<string, string>; set: (k: string, v: string) => void; ft: 'workout' | 'diet' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">

            {/* Fitness level — shown for both plan types */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>[ FITNESS LEVEL ]</p>
                <div style={{ display: 'flex', gap: 6 }}>
                    {FITNESS_LEVELS.map(l => (
                        <button key={l} className={`ob-chip${d.fitnessLevel === l ? ' on' : ''}`}
                            style={{ flex: 1, textAlign: 'center', padding: '10px 4px' }}
                            onClick={() => set('fitnessLevel', l)}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activity level */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>[ ACTIVITY LEVEL ]</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ACTIVITY_LEVELS.map(l => (
                        <Chip key={l} label={l} active={d.activityLevel === l} onClick={() => set('activityLevel', l)} />
                    ))}
                </div>
            </div>

            {ft === 'workout' ? (
                <>
                    {/* Training days */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p className="field-label" style={{ marginBottom: 2 }}>[ TRAINING DAYS / WEEK ]</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {[2, 3, 4, 5, 6].map(n => (
                                <button key={n} className={`ob-chip${d.workoutDaysPerWeek === String(n) ? ' on' : ''}`}
                                    style={{ flex: 1, textAlign: 'center', padding: '10px 4px' }}
                                    onClick={() => set('workoutDaysPerWeek', String(n))}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>3–4 sessions optimal for most athletes</p>
                    </div>

                    {/* Session duration */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p className="field-label" style={{ marginBottom: 2 }}>[ SESSION DURATION ]</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {SESSION_DURATIONS.map(d_ => (
                                <Chip key={d_} label={d_} active={d.sessionDuration === d_} onClick={() => set('sessionDuration', d_)} />
                            ))}
                        </div>
                    </div>

                    {/* Training location */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p className="field-label" style={{ marginBottom: 2 }}>[ TRAINING LOCATION ]</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {TRAINING_LOCATIONS.map(l => (
                                <Chip key={l} label={l} active={d.trainingLocation === l} onClick={() => set('trainingLocation', l)} />
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                /* Diet-only fields */
                <div className="diet-fields">
                    <Field label="Allergies" placeholder="nuts, dairy…" value={d.allergies || ''} onChange={e => set('allergies', e.target.value)} />
                    <Field label="Restrictions" placeholder="halal, no pork…" value={d.foodRestrictions || ''} onChange={e => set('foodRestrictions', e.target.value)} />
                    <Field label="Meals/Day" placeholder="3 + 2 snacks" value={d.mealFrequency || ''} onChange={e => set('mealFrequency', e.target.value)} />
                    <Field label="Cal. Goal" placeholder="deficit / surplus" value={d.caloricPreference || ''} onChange={e => set('caloricPreference', e.target.value)} />
                </div>
            )}
        </div>
    );
}

// ─── Step 4: Lifestyle (NEW) ──────────────────────────────────────────────────
export function Step4({ d, set, ft }: { d: Record<string, string>; set: (k: string, v: string) => void; ft: 'workout' | 'diet' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">

            {/* Dietary preference — shown for both */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>[ DIETARY PREFERENCE ]</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {DIETS.map(g => <Chip key={g} label={g} active={d.dietType === g} onClick={() => set('dietType', g)} />)}
                </div>
            </div>

            {/* Diet-specific fields when on the nutrition plan type */}
            {ft === 'diet' && (
                <>
                    <Field label="Allergies" placeholder="nuts, dairy…" value={d.allergies || ''} onChange={e => set('allergies', e.target.value)} />
                    <div className="fields-2col">
                        <Field label="Restrictions" placeholder="halal, no pork…" value={d.foodRestrictions || ''} onChange={e => set('foodRestrictions', e.target.value)} />
                        <Field label="Meals / Day" placeholder="3 + 2 snacks" value={d.mealFrequency || ''} onChange={e => set('mealFrequency', e.target.value)} />
                    </div>
                    <Field label="Calorie Goal" placeholder="deficit / surplus / maintain" value={d.caloricPreference || ''} onChange={e => set('caloricPreference', e.target.value)} />
                </>
            )}

            {/* Sleep */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>[ SLEEP DURATION ]</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SLEEP_OPTIONS.map(s => (
                        <Chip key={s} label={s} active={d.sleepDuration === s} onClick={() => set('sleepDuration', s)} />
                    ))}
                </div>
            </div>

            {/* Stress level */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>[ STRESS LEVEL ]</p>
                <div style={{ display: 'flex', gap: 6 }}>
                    {STRESS_LEVELS.map(s => (
                        <button key={s} className={`ob-chip${d.stressLevel === s ? ' on' : ''}`}
                            style={{ flex: 1, textAlign: 'center', padding: '10px 4px' }}
                            onClick={() => set('stressLevel', s)}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}