import { DIETS, GOALS } from "@/lib/constants";
import { Chip } from "./Chip";
import { Field } from "./Field";
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

export function Step2({ d, set }: { d: Record<string, string>; set: (k: string, v: string) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>🎯 Your Primary Goal</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {GOALS.map(g => <Chip key={g} label={g} active={d.goal === g} onClick={() => set('goal', g)} />)}
                </div>
            </div>
            <Field label="Health Conditions" placeholder="e.g. lower back pain, hypertension" hint="optional"
                value={d.healthConditions || ''} onChange={e => set('healthConditions', e.target.value)} />
        </div>
    );
}

export function Step3({ d, set, ft }: { d: Record<string, string>; set: (k: string, v: string) => void; ft: 'workout' | 'diet' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="field-label" style={{ marginBottom: 2 }}>🥗 Dietary Preference</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {DIETS.map(g => <Chip key={g} label={g} active={d.dietType === g} onClick={() => set('dietType', g)} />)}
                </div>
            </div>
            {ft === 'workout' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p className="field-label" style={{ marginBottom: 2 }}>📅 Training Days / Week</p>
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
            ) : (
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