'use client';

import { useState, useCallback } from 'react';
import { useMount } from '@/hooks/useMount';
import { Generating } from '@/components/Generating';
import { Form } from '@/components/FormShell';
import { EmptyState } from '@/components/EmptyState';
import { WorkoutOut } from '@/components/WorkoutOut';
import { DietOut } from '@/components/DietOut';
import { AuthModal } from '@/components/AuthModal';

import { getSafeDiet, getSafeWorkout, calculateMetrics } from '@/lib/helpers';
import { ProgressBar } from '@/components/ProgressBar';



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

    const metrics = calculateMetrics(data);
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



  return (
    <>
      <AuthModal />
      <div className="ob-page" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>

        {/* ── HERO STRIP — compact, above the fold ────────────────────── */}
        <div className="hero-strip">
          <div className="hero-strip-bg" />
          <div className="hero-strip-inner">

            {/* Eyebrow badge */}
            <div className="hero-eyebrow">
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--lime)', boxShadow: '0 0 12px var(--lime)',
                animation: 'ob-pulse-ring 2s ease-in-out infinite',
              }} />
              <span className="fitness-badge">
                Your AI Fitness Trainer
              </span>
            </div>

            {/* Main headline */}
            <h1 className="hero-title">
              YOUR <span className="accent">OBSIDIAN</span><br />
              FITNESS PROTOCOL
            </h1>

            {/* Sub text */}
            <p className="hero-subtitle">
              Stop guessing. Let AI generate your personalized workout routine &amp; meal plan
              based on your body, goals, and lifestyle — free &amp; instant.
            </p>

            {/* CTA anchor */}
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '10px 20px',
                background: 'var(--lime-dim)',
                border: '1px solid var(--border-lime)',
                color: 'var(--lime)',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                cursor: 'pointer', borderRadius: 3,
                transition: 'all 0.2s',
                width: 'fit-content',
              }}
              onClick={() => document.getElementById('generator-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <span>Start Building</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2V10M2 6L6 10L10 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Right — stat pills */}
          <div className="hero-stats-row">
            {[
              { num: '100%', label: 'AI\nPersonalized' },
              { num: '2 in 1', label: 'Workout &\nNutrition' },
              { num: 'Free', label: 'No signup\nneeded' },
            ].map((s, i) => (
              <div key={i} className="hero-stat-pill">
                <div className="hero-stat-num">{s.num}</div>
                <div className="hero-stat-label" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN APP GRID — form + output side by side ──────────── */}
        <div className="app-grid">

          {/* FORM PANEL */}
          <div className="form-panel" id="generator-form">

            {/* Panel header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--lime)', boxShadow: '0 0 8px var(--lime)',
                  animation: 'ob-pulse-dot 2.5s ease-in-out infinite',
                }} />
                <p style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.22em',
                  color: 'var(--lime)', textTransform: 'uppercase',
                }}>
                  Your Profile
                </p>
              </div>
              <h2 style={{
                fontFamily: "'Bebas Neue',sans-serif",
                fontSize: 26, letterSpacing: '0.06em', lineHeight: 1.1,
                color: 'var(--ink)', marginBottom: 4,
              }}>
                CONFIGURE YOUR PLAN
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
                Fill in your details across 3 quick steps to generate your personalized protocol.
              </p>
            </div>

            {/* Form card */}
            <div className="form-card">
              <Form onGenerate={generate} loading={loading} />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                borderLeft: '2px solid var(--red)',
                background: 'rgba(255,68,68,0.06)',
                borderRadius: '0 3px 3px 0',
                fontSize: 13, color: '#FF8888', lineHeight: 1.6,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M7 2L12.5 11.5H1.5L7 2Z" stroke="#FF8888" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
                  <path d="M7 6V8.5" stroke="#FF8888" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="7" cy="10" r="0.6" fill="#FF8888" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* OUTPUT PANEL */}
          <div className="output-panel" id="output-section">
            <div className="output-header">
              {has ? (
                wPlan && dPlan ? (
                  <div style={{ display: 'flex', gap: 0 }}>
                    {(['workout', 'diet'] as const).map(t => (
                      <button
                        key={t}
                        className={`ob-tab${active === t ? ' on' : ''}`}
                        onClick={() => setActive(t)}
                        style={{ paddingTop: 0, paddingBottom: 14 }}
                      >
                        {t === 'workout' ? 'TRAINING' : 'NUTRITION'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14 }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--lime)', boxShadow: '0 0 6px var(--lime)',
                    }} />
                    <p className="section-label" style={{ color: 'var(--lime)', fontSize: 12, letterSpacing: '0.16em' }}>
                      {active === 'workout' ? 'TRAINING PROTOCOL' : 'NUTRITION PROTOCOL'}
                    </p>
                  </div>
                )
              ) : (
                <p className="section-label" style={{ paddingBottom: 14 }}>RESULTS</p>
              )}

              {has && (
                <button
                  className="ob-btn-ghost"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(active === 'workout' ? wPlan : dPlan, null, 2))}
                  style={{ height: 30, padding: '0 12px', fontSize: 10, marginBottom: 12 }}
                >
                  EXPORT JSON
                </button>
              )}
            </div>

            {/* Progress bar — shows during generation */}
            <ProgressBar progress={progress} />

            {loading || (progress && progress.status !== 'complete' && progress.status !== 'error') ? <Generating />
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