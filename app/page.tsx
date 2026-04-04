'use client';

import { useState, useCallback } from 'react';
import { useMount } from '@/hooks/useMount';
import { Generating } from '@/components/Generating';
import { Form } from '@/components/FormShell';
import { EmptyState } from '@/components/EmptyState';
import { WorkoutOut } from '@/components/WorkoutOut';
import { DietOut } from '@/components/DietOut';

import { getSafeDiet, getSafeWorkout } from '@/lib/helpers';

// ── Progress state type ────────────────────────────────────────────────────────

interface GenProgress {
  done: number;
  total: number;
  units: string[];   // completed unit names
  status: 'generating' | 'validating' | 'recovering' | 'complete' | 'error';
}

export default function Home() {
  const [wPlan, setWPlan] = useState<WorkoutPlan | null>(null);
  const [dPlan, setDPlan] = useState<DietPlan | null>(null);
  const [active, setActive] = useState<'workout' | 'diet' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<GenProgress | null>(null);
  const mounted = useMount();

  // ── Parse newline-delimited JSON events from stream ───────────────────────

  const processStream = useCallback(async (
    response: Response,
    ft: 'workout' | 'diet',
    metrics: any,
    data: Record<string, string>
  ) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('No response body');

    let buffer = '';
    let finalPlan: any = null;
    let finalValidation: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const event = JSON.parse(trimmed);

          if (event.type === 'progress') {
            setLoading(false); // Drop spinner as soon as progress starts
            setProgress(prev => ({
              done: event.done,
              total: event.total,
              units: [...(prev?.units || []), event.unit],
              status: 'generating',
            }));
          } else if (event.type === 'complete') {
            finalPlan = event.plan;
            finalValidation = event.validation;

            setProgress(prev => ({
              ...prev!,
              status: 'complete',
              done: prev?.total || event.validation?.dayCount || event.validation?.mealCount || 0,
              total: prev?.total || event.validation?.dayCount || event.validation?.mealCount || 0,
            }));

            // Hydrate and set plan immediately
            if (ft === 'workout') {
              setWPlan(getSafeWorkout(finalPlan, metrics, data.goal) as WorkoutPlan);
              setActive('workout');
            } else {
              setDPlan(getSafeDiet(finalPlan, metrics, data.goal, data.dietType) as DietPlan);
              setActive('diet');
            }
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        } catch (parseErr) {
          // For cached responses that are the raw complete event
          try {
            const cached = JSON.parse(trimmed);
            if (cached.plan) {
              finalPlan = cached.plan;
              finalValidation = cached.validation;
              if (ft === 'workout') {
                setWPlan(getSafeWorkout(finalPlan, metrics, data.goal) as WorkoutPlan);
                setActive('workout');
              } else {
                setDPlan(getSafeDiet(finalPlan, metrics, data.goal, data.dietType) as DietPlan);
                setActive('diet');
              }
            }
          } catch { /* ignore */ }
        }
      }
    }

    return { plan: finalPlan, validation: finalValidation };
  }, []);

  // ── Frontend recovery: trigger backend recovery for missing units ──────────

  const recoverMissing = useCallback(async (
    ft: 'workout' | 'diet',
    missing: string[],
    requestData: Record<string, any>,
    currentPlan: any,
    metrics: any,
    data: Record<string, string>
  ) => {
    if (missing.length === 0) return;

    setProgress(prev => ({
      ...prev!,
      status: 'recovering',
    }));

    try {
      const res = await fetch('/api/generate/recover', {
        method: 'POST',
        body: JSON.stringify({ type: ft, missing, requestData }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) return;
      const result = await res.json();
      if (!result.success || !result.recovered) return;

      // Merge recovered units into current plan
      if (ft === 'workout') {
        const dayMap = new Map<string, any>();
        for (const d of (currentPlan.days || [])) dayMap.set(d.day, d);
        for (const d of result.recovered) dayMap.set(d.day, d);
        currentPlan.days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          .map(d => dayMap.get(d)).filter(Boolean);
        setWPlan(getSafeWorkout(currentPlan, metrics, data.goal) as WorkoutPlan);
      } else {
        const mealMap = new Map<string, any>();
        for (const m of (currentPlan.meals || [])) mealMap.set(m.meal, m);
        for (const m of result.recovered) mealMap.set(m.meal, m);
        currentPlan.meals = [...mealMap.values()];
        setDPlan(getSafeDiet(currentPlan, metrics, data.goal, data.dietType) as DietPlan);
      }

      setProgress(prev => ({ ...prev!, status: 'complete' }));
    } catch (err) {
      console.warn('Recovery failed:', err);
    }
  }, []);

  // ── Main generate function ────────────────────────────────────────────────

  const generate = async (data: Record<string, string>, ft: 'workout' | 'diet') => {
    setLoading(true);
    setError('');
    setProgress({ done: 0, total: ft === 'workout' ? 7 : 4, units: [], status: 'generating' });

    // Deterministic metrics calculation
    const h = parseFloat(data.height || '170');
    const w = parseFloat(data.weight || '70');
    const a = parseFloat(data.age || '30');
    const isM = data.gender === 'Male';
    const bmi = w / ((h / 100) ** 2);
    let bmiCat = "Normal";
    if (bmi < 18.5) bmiCat = "Underweight";
    else if (bmi < 25) bmiCat = "Normal";
    else if (bmi < 30) bmiCat = "Overweight";
    else bmiCat = "Obese";
    const bmr = Math.round(10 * w + 6.25 * h - 5 * a + (isM ? 5 : -161));
    const days = parseInt(data.workoutDaysPerWeek || '3');
    const act = days === 0 ? 1.2 : days <= 3 ? 1.375 : days <= 5 ? 1.55 : 1.725;
    const tdee = Math.round(bmr * act);
    let cals = tdee;
    if (data.goal?.includes('Lose') || data.goal?.includes('Cut') || data.goal?.includes('Fat') || data.goal?.includes('Tone')) cals -= 500;
    else if (data.goal?.includes('Bulk') || data.goal?.includes('Build') || data.goal?.includes('Muscle')) cals += 300;
    cals = Math.round(cals / 50) * 50;

    const metrics = {
      bmi: parseFloat(bmi.toFixed(1)), bmiCategory: bmiCat,
      bmr, tdee, recommendedCalories: cals, dailyCalories: cals
    };
    const requestData = { ...data, ...metrics };

    try {
      let result: { plan: any; validation: any } | null = null;

      // Try primary (Gemini modular)
      try {
        const url = ft === 'workout' ? '/api/generate/gemini/workout' : '/api/generate/gemini/diet';
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Primary generation failed');

        const usedModel = response.headers.get("X-Model-Used") || "gemini-2.5-flash";
        window.dispatchEvent(new CustomEvent('model-active', { detail: usedModel }));

        result = await processStream(response, ft, metrics, data);
      } catch (err) {
        console.warn('Primary LLM failed, falling back to NVIDIA...', err);

        // Fallback to NVIDIA
        const fallbackUrl = ft === 'workout' ? '/api/generate/nvidia/workout' : '/api/generate/nvidia/diet';
        const response = await fetch(fallbackUrl, {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Fallback generation failed');

        const usedModel = response.headers.get("X-Model-Used") || "gemma-4-31b-it";
        window.dispatchEvent(new CustomEvent('model-active', { detail: usedModel }));

        result = await processStream(response, ft, metrics, data);
      }

      // ── Post-stream frontend validation & recovery ─────────────────────
      if (result?.validation && result.plan) {
        const v = result.validation;
        const missing: string[] = [];

        if (ft === 'workout' && v.missingDays?.length > 0) {
          missing.push(...v.missingDays);
        } else if (ft === 'diet' && v.missingMeals?.length > 0) {
          missing.push(...v.missingMeals);
        }

        // Trigger recovery if there are still missing sections after backend retries
        if (missing.length > 0) {
          console.log(`[frontend] Detected ${missing.length} missing units, triggering recovery...`);
          await recoverMissing(ft, missing, requestData, result.plan, metrics, data);
        }
      }

      if (!result?.plan) {
        throw new Error('Empty response from API');
      }

      // Mobile scroll
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setProgress(prev => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setLoading(false);
    }
  };

  const has = wPlan || dPlan;

  // ── Progress bar component ──────────────────────────────────────────────────

  const ProgressBar = () => {
    if (!progress || progress.status === 'complete') return null;
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    const statusLabel = {
      generating: 'GENERATING',
      validating: 'VALIDATING',
      recovering: 'RECOVERING MISSING',
      complete: 'COMPLETE',
      error: 'ERROR',
    }[progress.status];

    return (
      <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6,
              background: progress.status === 'error' ? 'var(--red)' : 'var(--lime)',
              boxShadow: `0 0 8px ${progress.status === 'error' ? 'var(--red)' : 'var(--lime)'}`,
              animation: progress.status === 'error' ? 'none' : 'ob-pulse-dot 1s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.18em', color: progress.status === 'error' ? 'var(--red)' : 'var(--lime)',
            }}>
              {statusLabel}
            </span>
          </div>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>
            {progress.done}/{progress.total}
          </span>
        </div>
        {/* Bar */}
        <div style={{ height: 3, background: 'var(--bg-3)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: progress.status === 'recovering' ? 'var(--amber)' : 'var(--lime)',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {/* Unit chips */}
        {progress.units.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {progress.units.map((u, i) => (
              <span key={i} className="ob-badge" style={{
                background: 'var(--lime-dim)', color: 'var(--lime)',
                border: '1px solid rgba(200,241,53,0.2)', fontSize: 9,
                animation: 'ob-fade-in 0.3s ease',
              }}>
                {u} ✓
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="ob-page" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        {/* ── HERO ──────────────────────────────────────────── */}
        <div className="hero-grid">
          <div style={{ position: 'absolute', right: -20, bottom: -10, fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(120px,18vw,260px)', lineHeight: 1, letterSpacing: '-0.06em', color: 'rgba(200,241,53,0.025)', pointerEvents: 'none', userSelect: 'none' }}>
            AI
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ width: 6, height: 6, background: 'var(--lime)', boxShadow: '0 0 10px var(--lime)', animation: 'ob-pulse-ring 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.28em', color: 'var(--lime)', textTransform: 'uppercase' }}>
                AI Fitness & Diet Generator
              </span>
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(48px,9vw,86px)', lineHeight: 0.92, letterSpacing: '0.02em', color: 'var(--ink)', marginBottom: 20 }}>
              AI WORKOUT &<br />
              <span style={{ color: 'var(--lime)', textShadow: '0 0 40px rgba(200,241,53,0.25)' }}>DIET</span><br />
              GENERATOR
            </h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
              <div style={{ width: 40, height: 1, background: 'var(--lime)' }} />
              <div style={{ width: 8, height: 1, background: 'var(--border-hi)' }} />
              <div style={{ width: 4, height: 1, background: 'var(--border)' }} />
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 400, lineHeight: 1.85, marginBottom: 28 }}>
              Stop guessing. Let our AI generate your fully tailored workout routine and
              personalized meal plan based on your unique biometrics and fitness goals.
              Start completely free below.
            </p>
            <button
              className="ob-btn-lime"
              style={{ width: 'auto', padding: '0 28px', height: 50, display: 'inline-flex', alignItems: 'center', gap: 12 }}
              onClick={() => document.getElementById('generator-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <span>BUILD YOUR PROTOCOL</span>
              <span style={{ fontSize: 16, marginTop: -2 }}>↓</span>
            </button>
          </div>

          <div className="hero-stats">
            {[
              { num: '100%', label: 'AI PERSONALIZED' },
              { num: '2-IN-1', label: 'WORKOUTS & DIET' },
            ].map((stat, i) => (
              <div key={i} className="hero-stat">
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: '0.04em', color: i === 0 ? 'var(--lime)' : 'var(--ink)', lineHeight: 1 }}>
                  {stat.num}
                </p>
                <p className="section-label" style={{ marginTop: 4 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN APP GRID ──────────────────────────────────── */}
        <div className="app-grid">

          <div className="form-panel" id="generator-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, letterSpacing: '0.14em', color: 'var(--ink-2)' }}>
                BUILD YOUR PROTOCOL
              </p>
              <div style={{ width: 6, height: 6, background: 'var(--lime)', boxShadow: '0 0 8px var(--lime)', animation: 'ob-pulse-dot 2s ease-in-out infinite' }} />
            </div>

            <Form onGenerate={generate} loading={loading} />

            {error && (
              <div style={{ marginTop: 16, padding: '12px 14px', borderLeft: '2px solid var(--red)', background: 'rgba(255,64,64,0.06)', fontSize: 12, color: '#FF8080', lineHeight: 1.6 }}>
                {error}
              </div>
            )}
          </div>

          {/* OUTPUT */}
          <div className="output-panel" id="output-section">
            <div className="output-header">
              {has ? (
                wPlan && dPlan ? (
                  <div style={{ display: 'flex', gap: 0 }}>
                    {(['workout', 'diet'] as const).map(t => (
                      <button key={t} className={`ob-tab${active === t ? ' on' : ''}`} onClick={() => setActive(t)} style={{ paddingTop: 0, paddingBottom: 14 }}>
                        {t === 'workout' ? 'TRAINING' : 'NUTRITION'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14 }}>
                    <div style={{ width: 4, height: 4, background: 'var(--lime)', boxShadow: '0 0 6px var(--lime)' }} />
                    <p className="section-label" style={{ color: 'var(--lime)' }}>
                      {active === 'workout' ? 'TRAINING PROTOCOL' : 'NUTRITION PROTOCOL'}
                    </p>
                  </div>
                )
              ) : (
                <p className="section-label" style={{ paddingBottom: 14 }}>PROTOCOL OUTPUT</p>
              )}

              {has && (
                <button className="ob-btn-ghost"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(active === 'workout' ? wPlan : dPlan, null, 2))}
                  style={{ height: 32, padding: '0 12px', fontSize: 10, marginBottom: 12 }}>
                  EXPORT JSON
                </button>
              )}
            </div>

            {/* Progress bar — shows during generation */}
            <ProgressBar />

            {loading && !progress ? <Generating />
              : loading && progress ? <Generating />
                : !has ? <EmptyState />
                  : active === 'workout' && wPlan ? <WorkoutOut plan={wPlan} />
                    : active === 'diet' && dPlan ? <DietOut plan={dPlan} />
                      : null}
          </div>
        </div>
      </div>
    </>
  );
}