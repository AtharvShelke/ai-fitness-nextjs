'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useMount } from '@/hooks/useMount';
import { Generating } from '@/components/Generating';
import { Form } from '@/components/FormShell';
import { EmptyState } from '@/components/EmptyState';
import { WorkoutOut } from '@/components/WorkoutOut';
import { DietOut } from '@/components/DietOut';

import { parse } from 'partial-json';

function getSafeWorkout(partial: any, metrics: any) {
  return {
      summary: { ...metrics, ...partial.summary },
      weeklySchedule: (partial.weeklySchedule || []).map((d: any) => ({
          day: d.day || '',
          type: d.type || 'rest',
          focus: d.focus || '',
          durationMinutes: d.durationMinutes || 0,
          exercises: d.exercises || []
      })),
      warmup: partial.warmup || [],
      cooldown: partial.cooldown || [],
      progressionPlan: {
          week1_2: partial.progressionPlan?.week1_2 || '',
          week3_4: partial.progressionPlan?.week3_4 || '',
          week5_6: partial.progressionPlan?.week5_6 || ''
      },
      warnings: partial.warnings || [],
      tips: partial.tips || []
  };
}

function getSafeDiet(partial: any, metrics: any) {
  return {
      summary: { ...metrics, ...partial.summary },
      mealPlan: (partial.mealPlan || []).map((m: any) => ({
          meal: m.meal || '',
          time: m.time || '',
          options: (m.options || []).map((o: any) => ({
              name: o.name || '',
              calories: o.calories || 0,
              protein: o.protein || '0g',
              carbs: o.carbs || '0g',
              fats: o.fats || '0g',
              prepMinutes: o.prepMinutes || 0,
              ingredients: o.ingredients || [],
              notes: o.notes || ''
          }))
      })),
      supplements: (partial.supplements || []).map((s: any) => ({
          name: s.name || '', dose: s.dose || '', timing: s.timing || ''
      })),
      avoidFoods: partial.avoidFoods || [],
      weeklyVariation: {
          refeedDay: partial.weeklyVariation?.refeedDay || '',
          lowCarbDay: partial.weeklyVariation?.lowCarbDay || ''
      },
      warnings: partial.warnings || [],
      tips: partial.tips || []
  };
}

export default function Home() {
  const [wPlan, setWPlan] = useState<WorkoutPlan | null>(null);
  const [dPlan, setDPlan] = useState<DietPlan | null>(null);
  const [active, setActive] = useState<'workout' | 'diet' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useMount();

  const generate = async (data: Record<string, string>, ft: 'workout' | 'diet') => {
    setLoading(true); setError('');

    // Deterministic metrics calculation
    const h = parseFloat(data.height || '170');
    const w = parseFloat(data.weight || '70');
    const a = parseFloat(data.age || '30');
    const isM = data.gender === 'Male';
    const bmi = w / ((h/100) ** 2);
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
    if (data.goal?.includes('Lose') || data.goal?.includes('Cut')) cals -= 500;
    else if (data.goal?.includes('Bulk') || data.goal?.includes('Build')) cals += 300;
    
    // Nearest 50
    cals = Math.round(cals / 50) * 50;

    const metrics = {
      bmi: parseFloat(bmi.toFixed(1)), bmiCategory: bmiCat,
      bmr, tdee, recommendedCalories: cals, dailyCalories: cals
    };
    const requestData = { ...data, ...metrics };
    
    const handleChunk = (chunkStr: string) => {
      try {
        const cleaned = chunkStr.replace(/^```(?:json)?\s*/i, "").replace(/\s* completion\n?|```$/g, "").replace(/\s*```$/, "").trim();
        if (!cleaned) return;
        const partialObj = parse(cleaned);
        if (partialObj && typeof partialObj === 'object') {
          if (ft === 'workout') {
            setWPlan(getSafeWorkout(partialObj, metrics) as WorkoutPlan);
            setActive('workout');
          } else {
            setDPlan(getSafeDiet(partialObj, metrics) as DietPlan);
            setActive('diet');
          }
        }
      } catch (e) {
        // ignore parse errors for partial chunks
      }
    };

    try {
      let rawText = "";
      try {
        const url = ft === 'workout' ? '/api/generate/gemini/workout' : '/api/generate/gemini/diet';
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Primary model generation failed');
        
        const usedModel = response.headers.get("X-Model-Used") || "gemini-2.5-flash";
        window.dispatchEvent(new CustomEvent('model-active', { detail: usedModel }));
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setLoading(false); // Drop loading state as soon as first chunk arrives
            rawText += decoder.decode(value, { stream: true });
            handleChunk(rawText);
          }
        }
      } catch (err) {
        console.warn('Primary LLM failed, falling back to NVIDIA...', err);
        const fallbackUrl = ft === 'workout' ? '/api/generate/nvidia/workout' : '/api/generate/nvidia/diet';
        const response = await fetch(fallbackUrl, {
          method: 'POST',
          body: JSON.stringify(requestData),
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Fallback generation failed');
        
        const usedModel = response.headers.get("X-Model-Used") || "gemma-4-31b-it";
        window.dispatchEvent(new CustomEvent('model-active', { detail: usedModel }));
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        rawText = ""; // reset for fallback
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            setLoading(false); // Drop loading state for fallback as well
            rawText += decoder.decode(value, { stream: true });
            handleChunk(rawText);
          }
        }
      }

      // Final parse after stream complete
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s* completion\n?|```$/g, "").replace(/\s*```$/, "").trim();
      if (!cleaned) throw new Error("Empty response from API");
      const planObj = JSON.parse(cleaned);

      // Merge deterministic fields into LLM response
      planObj.summary = { ...planObj.summary, ...metrics };

      if (ft === 'workout') { setWPlan(planObj); setActive('workout'); }
      else { setDPlan(planObj); setActive('diet'); }

      // On mobile, scroll to the output section after generation
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  const has = wPlan || dPlan;

  return (
    <>
      <div className="ob-page" style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        {/* ── HERO ──────────────────────────────────────────── */}
        <div className="hero-grid">
          {/* Ghost BG text */}
          <div style={{ position: 'absolute', right: -20, bottom: -10, fontFamily: "'Bebas Neue',sans-serif", fontSize: 'clamp(120px,18vw,260px)', lineHeight: 1, letterSpacing: '-0.06em', color: 'rgba(200,241,53,0.025)', pointerEvents: 'none', userSelect: 'none' }}>
            AI
          </div>

          {/* Headline */}
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

          {/* Stats */}
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
        {/* On mobile: form stacked above output
            On desktop: form left, output right               */}
        <div className="app-grid">

          {/* FORM */}
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
              {/* Left: tab switcher or label */}
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

              {/* Right: export */}
              {has && (
                <button className="ob-btn-ghost"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(active === 'workout' ? wPlan : dPlan, null, 2))}
                  style={{ height: 32, padding: '0 12px', fontSize: 10, marginBottom: 12 }}>
                  EXPORT JSON
                </button>
              )}
            </div>

            {loading ? <Generating />
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