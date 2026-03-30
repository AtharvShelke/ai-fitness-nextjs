'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WorkoutSummary {
  bmi: number; bmiCategory: string; bmr: number;
  tdee: number; fitnessLevel: string; recommendedCalories: number;
}
interface Exercise {
  name: string; sets: number; reps: string;
  rest: string; muscle: string; tips: string;
}
interface DaySchedule {
  day: string; type: 'training' | 'rest' | 'active_recovery';
  focus: string; durationMinutes: number; exercises: Exercise[];
}
interface WorkoutPlan {
  summary: WorkoutSummary;
  weeklySchedule: DaySchedule[];
  warmup: string[]; cooldown: string[];
  progressionPlan: { week1_2: string; week3_4: string; week5_6: string };
  warnings: string[]; tips: string[];
}
interface DietSummary {
  dailyCalories: number; protein: string; carbs: string;
  fats: string; hydration: string; dietLabel: string;
}
interface MealOption {
  name: string; calories: number; protein: string; carbs: string;
  fats: string; prepMinutes: number; ingredients: string[]; notes: string;
}
interface Meal { meal: string; time: string; options: MealOption[] }
interface DietPlan {
  summary: DietSummary;
  mealPlan: Meal[];
  supplements: { name: string; dose: string; timing: string }[];
  avoidFoods: string[];
  weeklyVariation: { refeedDay: string; lowCarbDay: string };
  warnings: string[]; tips: string[];
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700;800&family=Barlow:wght@300;400;500&family=DM+Mono:wght@300;400;500&display=swap');

  :root {
    --bg:           #080809;
    --bg-2:         #0D0D0F;
    --bg-3:         #131315;
    --bg-4:         #1B1B1E;
    --ink:          #ECEAE6;
    --ink-2:        #9896A0;
    --ink-3:        #55535A;
    --ink-4:        #2A2930;
    --lime:         #C8F135;
    --lime-dim:     rgba(200,241,53,0.1);
    --lime-glow:    rgba(200,241,53,0.05);
    --red:          #FF4040;
    --amber:        #E8A020;
    --border:       rgba(236,234,230,0.07);
    --border-hi:    rgba(236,234,230,0.14);
    --font-display: 'Bebas Neue', sans-serif;
    --font-cond:    'Barlow Condensed', sans-serif;
    --font-body:    'Barlow', sans-serif;
    --font-mono:    'DM Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-weight: 500;
    font-family: var(--font-body);
    background: var(--bg);
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  /* ── Scrollbar ─────────────────────────────────────────── */
  ::-webkit-scrollbar { width: 2px; height: 2px; }
  ::-webkit-scrollbar-thumb { background: var(--ink-4); }
  ::-webkit-scrollbar-track { background: transparent; }

  /* ── Inputs ─────────────────────────────────────────────── */
  .ob-input {
    width: 100%; height: 48px;
    background: var(--bg-3);
    border: 1px solid var(--border);
    border-bottom: 1px solid var(--border-hi);
    color: var(--ink);
    padding: 0 14px;
    font-size: 16px;
    font-family: var(--font-body);
    outline: none;
    letter-spacing: 0.01em;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    border-radius: 0;
    -webkit-appearance: none;
    appearance: none;
  }
  .ob-input::placeholder { color: var(--ink-3); }
  .ob-input:hover  { border-color: rgba(200,241,53,0.25); background: var(--bg-4); }
  .ob-input:focus  {
    border-color: var(--lime);
    background: rgba(200,241,53,0.04);
    box-shadow: 0 2px 0 rgba(200,241,53,0.18), 0 8px 24px rgba(200,241,53,0.04);
  }

  /* ── Buttons ─────────────────────────────────────────────── */
  .ob-btn-ghost {
    font-family: var(--font-cond);
    font-size: 13px; font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    background: transparent;
    border: 1px solid var(--border-hi);
    color: var(--ink-2);
    cursor: pointer;
    transition: all 0.18s;
    padding: 0 20px; height: 44px;
    white-space: nowrap;
  }
  .ob-btn-ghost:hover { border-color: var(--lime); color: var(--lime); background: var(--lime-dim); }

  .ob-btn-lime {
    font-family: var(--font-cond);
    font-size: 13px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase;
    background: var(--lime);
    border: none; color: var(--bg);
    cursor: pointer;
    transition: opacity 0.2s;
    height: 52px; padding: 0 28px;
    position: relative; overflow: hidden;
    width: 100%;
  }
  .ob-btn-lime:hover { opacity: 0.9; }
  .ob-btn-lime:disabled { background: var(--ink-4); color: var(--ink-3); cursor: not-allowed; }

  /* ── Chips ───────────────────────────────────────────────── */
  .ob-chip {
    font-family: var(--font-cond);
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    padding: 9px 14px;
    border: 1px solid var(--border-hi);
    background: transparent; color: var(--ink-3);
    cursor: pointer;
    transition: all 0.16s;
    white-space: nowrap;
    /* tap-friendly on mobile */
    min-height: 40px;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .ob-chip:hover { border-color: var(--ink-3); color: var(--ink-2); }
  .ob-chip.on {
    border-color: var(--lime); color: var(--lime);
    background: var(--lime-dim);
    box-shadow: 0 0 16px rgba(200,241,53,0.08);
  }

  /* ── Tabs ────────────────────────────────────────────────── */
  .ob-tabs {
    display: flex; gap: 0;
    border-bottom: 1px solid var(--border);
    overflow-x: auto; scrollbar-width: none;
  }
  .ob-tabs::-webkit-scrollbar { display: none; }
  .ob-tab {
    font-family: var(--font-cond);
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    padding: 14px 18px;
    background: transparent; border: none;
    border-bottom: 2px solid transparent;
    color: var(--ink-3);
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
    margin-bottom: -1px;
    /* tap-friendly */
    min-height: 48px;
  }
  .ob-tab:hover { color: var(--ink-2); }
  .ob-tab.on { color: var(--lime); border-bottom-color: var(--lime); }

  /* ── Accordion rows ──────────────────────────────────────── */
  .ob-row {
    border: 1px solid var(--border);
    border-bottom: none;
    transition: border-color 0.18s, background 0.18s;
    min-width: 0;        /* shrink within grid/flex */
    overflow: hidden;    /* clip any internal content that grows wider */
  }
  .ob-row:last-child { border-bottom: 1px solid var(--border); }
  .ob-row:hover { border-color: var(--border-hi); }
  .ob-row.open {
    border-color: rgba(200,241,53,0.3) !important;
    border-bottom: 1px solid rgba(200,241,53,0.15) !important;
  }

  /* ── Stat number ─────────────────────────────────────────── */
  .ob-stat-num {
    font-family: var(--font-display);
    letter-spacing: 0.02em; line-height: 1; color: var(--ink);
  }

  /* ── Badge ───────────────────────────────────────────────── */
  .ob-badge {
    font-family: var(--font-cond);
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 3px 9px 2px;
    display: inline-flex; align-items: center;
  }

  /* ── Step dot ────────────────────────────────────────────── */
  .ob-step-dot {
    width: 8px; height: 8px;
    border: 1px solid var(--ink-3);
    background: transparent;
    transition: all 0.3s; flex-shrink: 0;
  }
  .ob-step-dot.done {
    background: var(--lime); border-color: var(--lime);
    box-shadow: 0 0 8px rgba(200,241,53,0.5);
  }

  /* ── Section label ───────────────────────────────────────── */
  .section-label {
    font-family: var(--font-cond);
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--ink-3);
  }

  /* ── Table wrapper (horizontal scroll on mobile) ─────────── */
  .ob-table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;     /* hard cap — scroll inside, never outside */
  }
  .ob-table { width: 100%; border-collapse: collapse; min-width: 520px; }
  .ob-table th {
    font-family: var(--font-cond);
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--ink-3); padding: 10px 14px;
    text-align: left; background: var(--bg-2);
    border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .ob-table th.center { text-align: center; }
  .ob-table td {
    padding: 12px 14px; font-size: 13px;
    color: var(--ink-2); border-bottom: 1px solid var(--border);
    vertical-align: top; line-height: 1.5;
  }
  .ob-table td.center { text-align: center; }
  .ob-table tr:last-child td { border-bottom: none; }
  .ob-table tr:hover td { background: rgba(255,255,255,0.015); }

  /* ── Macro bar ───────────────────────────────────────────── */
  .macro-track {
    height: 2px; background: var(--bg-4);
    position: relative; overflow: hidden;
  }
  .macro-fill {
    height: 100%;
    transition: width 1.2s cubic-bezier(0.16,1,0.3,1);
  }
  .macro-fill::after {
    content: '';
    position: absolute; top: 0; bottom: 0; right: 0;
    width: 40px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25));
    animation: ob-scan 2s ease 1.2s 1;
  }

  /* ── Animations ──────────────────────────────────────────── */
  @keyframes ob-rise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ob-slide-l {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes ob-fade {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes ob-scan {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
  @keyframes ob-pulse-ring {
    0%,100% { box-shadow: 0 0 0 0 rgba(200,241,53,0.4); }
    50%      { box-shadow: 0 0 0 8px rgba(200,241,53,0); }
  }
  @keyframes ob-pulse-dot {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes breathe-lime {
    0%,100% { opacity: 0.3; width: 14px; }
    50%      { opacity: 1;   width: 36px; }
  }
  @keyframes ob-num-in {
    from { opacity: 0; transform: translateY(8px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes loader-dash {
    0%   { stroke-dashoffset: 220; }
    100% { stroke-dashoffset: -220; }
  }

  .ob-rise    { animation: ob-rise   0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .ob-slide-l { animation: ob-slide-l 0.55s cubic-bezier(0.16,1,0.3,1) both; }
  .ob-fade    { animation: ob-fade   0.4s ease both; }
  .ob-num-in  { animation: ob-num-in 0.5s cubic-bezier(0.16,1,0.3,1) both; }

  /* ── RESPONSIVE LAYOUT ───────────────────────────────────── */

  /* Shared container */
  .ob-page {
    max-width: 1280px; width: 100%; margin: 0 auto;
    padding: 0 16px 80px;
    overflow-x: hidden;
  }

  /* Hero grid: stacked on mobile, 2-col on desktop */
  .hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 40px 0 36px;
    border-bottom: 1px solid var(--border);
    position: relative;
    overflow: hidden;   /* clips the ghost "AI" bg text */
    width: 100%;        /* never wider than parent */
  }

  /* Stats strip: horizontal scroll on mobile, vertical stack on desktop */
  .hero-stats {
    display: flex; gap: 24px;
    overflow-x: auto; scrollbar-width: none;
    padding-bottom: 4px;
  }
  .hero-stats::-webkit-scrollbar { display: none; }
  .hero-stat { flex-shrink: 0; text-align: left; }

  /* Main app grid: stacked on mobile, side-by-side on desktop */
  .app-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    min-width: 0;    /* critical: grid children default to min-width:auto which causes overflow */
    width: 100%;
  }

  /* Form panel */
  .form-panel {
    padding: 28px 0 28px;
    border-bottom: 1px solid var(--border);
    min-width: 0;
  }

  /* Output panel */
  .output-panel {
    padding: 0;
    min-width: 0;     /* allows grid child to shrink below content size */
    overflow-x: hidden;
  }

  /* Output header */
  .output-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 0 0;
    border-bottom: 1px solid var(--border);
    min-height: 56px;
    gap: 10px;           /* stop export btn crowding label on narrow screens */
    flex-wrap: nowrap;
  }

  /* Stat grid in output: 2x2 on mobile, 4-col on desktop */
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid var(--border);
  }

  /* Stat block borders */
  .stat-block {
    padding: 16px 14px;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 5;
    position: relative; overflow: hidden;
  }
  .stat-block:nth-child(2n) { border-right: none; }
  .stat-block:nth-last-child(-n+2) { border-bottom: none; }

  /* Warmup grid: 1-col on mobile, 2-col on desktop */
  .warmup-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  /* Progress layout: stacked on mobile, grid on desktop */
  .progress-row {
    display: flex; flex-direction: column;
    border-bottom: 1px solid var(--border);
  }
  .progress-label {
    padding: 14px 16px 10px;
    background: var(--bg-2);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10; flex-wrap: wrap;
  }
  .progress-desc {
    padding: 14px 16px;
  }

  /* Step1 field grid: 2-col on mobile too (compact fields) */
  .fields-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* Diet 2-col fields */
  .diet-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  /* Caloric hero row */
  .cal-hero {
    padding: 20px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--bg-2);
    position: relative;
    overflow: hidden;    /* clips ghost kcal number on narrow screens */
  }

  /* ── Desktop breakpoint (≥ 1024px) ──────────────────────── */
  @media (min-width: 1024px) {
    .ob-page { padding: 0 28px 80px; }

    .hero-grid {
      grid-template-columns: 1fr 1fr;
      padding: 64px 0 48px;
      gap: 0;
    }

    .hero-stats {
      flex-direction: column;
      align-items: flex-end;
      gap: 20px;
      overflow-x: unset;
      padding-left: 40px;
      padding-bottom: 0;
    }
    .hero-stat { text-align: right; }

    .app-grid {
      grid-template-columns: 380px 1fr;
    }

    .form-panel {
      padding: 36px 28px 36px 0;
      border-bottom: none;
      border-right: 1px solid var(--border);
    }

    .output-panel {
      padding: 0 0 0 28px;
    }

    .output-header {
      padding: 20px 0 0;
    }

    /* 4-col stat grid on desktop */
    .stat-grid {
      grid-template-columns: repeat(4, 1fr);
    }
    .stat-block { border-bottom: none; }
    .stat-block:nth-child(2n) { border-right: 1px solid var(--border); }
    .stat-block:nth-child(4n) { border-right: none; }
    .stat-block:nth-last-child(-n+2) { border-bottom: none; }

    .warmup-grid {
      grid-template-columns: 1fr 1fr;
    }

    .progress-row {
      flex-direction: row;
    }
    .progress-label {
      width: 160px; min-width: 160px; flex-shrink: 0;
      border-bottom: none; border-right: 1px solid var(--border);
      padding: 18px 16px;
      flex-direction: column; align-items: flex-start; gap: 6;
    }
    .progress-desc {
      padding: 18px 16px;
    }

    .cal-hero {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px 20px;
    }

    .ob-btn-lime { width: auto; }
  }

  #output-section {
    scroll-margin-top: 72px; /* sticky nav height (60) + marquee (32) — prevent occlusion on mobile scroll */
  }

  /* ── Small mobile (< 400px): tighten chips ───────────────── */
  @media (max-width: 400px) {
    .ob-chip { padding: 8px 10px; font-size: 11px; }
    .fields-2col { grid-template-columns: 1fr 1fr; gap: 10px; }
    .diet-fields  { grid-template-columns: 1fr; }
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function useMount() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

// ─── Generating state ─────────────────────────────────────────────────────────

function Generating() {
  const [dot, setDot] = useState(0);
  const msgs = ['ANALYZING BIOMETRICS', 'CALCULATING TDEE', 'GENERATING PROTOCOL', 'CALIBRATING LOAD', 'OPTIMIZING SCHEDULE'];
  useEffect(() => {
    const id = setInterval(() => setDot(d => (d + 1) % msgs.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '72px 20px', minHeight: 360 }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', inset: 0 }}>
          <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="var(--border-hi)" strokeWidth="1" />
          <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="var(--lime)" strokeWidth="1.5" strokeDasharray="220" strokeLinecap="round"
            style={{ animation: 'loader-dash 2s linear infinite', filter: 'drop-shadow(0 0 6px var(--lime))' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 8, height: 8, background: 'var(--lime)', clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', animation: 'spin-slow 3s linear infinite', boxShadow: '0 0 12px var(--lime)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', minHeight: 56 }}>
        <div key={dot} className="ob-fade" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: '0.12em', color: 'var(--lime)', marginBottom: 6, textShadow: '0 0 20px rgba(200,241,53,0.4)' }}>
          {msgs[dot]}
        </div>
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ height: 1, background: 'var(--lime)', animation: `breathe-lime 1.6s ease-in-out ${i * 0.25}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'BIOMETRICS', sub: 'Height · Weight · Age · Sex' },
  { key: 'OBJECTIVES', sub: 'Goal · Health profile' },
  { key: 'PROTOCOL', sub: 'Preferences · Frequency' },
];

function StepProgress({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Track */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {i > 0 && <div style={{ flex: 1, height: 1, background: i <= step ? 'var(--lime)' : 'var(--border-hi)', transition: 'background 0.4s' }} />}
            <div className={`ob-step-dot${i <= step ? ' done' : ''}`} />
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: i < step ? 'var(--lime)' : 'var(--border-hi)', transition: 'background 0.4s' }} />}
          </div>
        ))}
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--lime)' }}>
            {STEPS[step].key}
          </p>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{STEPS[step].sub}</p>
        </div>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>{step + 1}/{STEPS.length}</span>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, hint, ...rest }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="section-label">{label}</label>
        {hint && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--lime)', opacity: 0.6 }}>{hint}</span>}
      </div>
      <input className="ob-input" {...rest} />
    </div>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className={`ob-chip${active ? ' on' : ''}`} onClick={onClick}>{label}</button>;
}

// ─── Form steps ───────────────────────────────────────────────────────────────

const GOALS = ['Fat Loss', 'Muscle Gain', 'Tone & Maintain', 'Endurance', 'Strength'];
const DIETS = ['Balanced', 'Vegetarian', 'Vegan', 'Keto', 'High-Protein', 'Paleo'];

function Step1({ d, set }: { d: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <div className="fields-2col ob-fade">
      <Field label="Height" placeholder="cm" type="number" hint="e.g. 175" value={d.height || ''} onChange={e => set('height', e.target.value)} />
      <Field label="Weight" placeholder="kg" type="number" hint="e.g. 72" value={d.weight || ''} onChange={e => set('weight', e.target.value)} />
      <Field label="Age" placeholder="years" type="number" value={d.age || ''} onChange={e => set('age', e.target.value)} />
      <Field label="Sex" placeholder="Male / Female / Other" value={d.gender || ''} onChange={e => set('gender', e.target.value)} />
    </div>
  );
}

function Step2({ d, set }: { d: Record<string, string>; set: (k: string, v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="section-label">Primary Objective</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {GOALS.map(g => <Chip key={g} label={g} active={d.goal === g} onClick={() => set('goal', g)} />)}
        </div>
      </div>
      <Field label="Health Conditions" placeholder="e.g. lower back pain, hypertension" hint="optional"
        value={d.healthConditions || ''} onChange={e => set('healthConditions', e.target.value)} />
    </div>
  );
}

function Step3({ d, set, ft }: { d: Record<string, string>; set: (k: string, v: string) => void; ft: 'workout' | 'diet' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="ob-fade">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="section-label">Dietary Protocol</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DIETS.map(g => <Chip key={g} label={g} active={d.dietType === g} onClick={() => set('dietType', g)} />)}
        </div>
      </div>
      {ft === 'workout' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="section-label">Training Days / Week</p>
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

// ─── Form shell ───────────────────────────────────────────────────────────────

function Form({ onGenerate, loading }: { onGenerate: (d: Record<string, string>, t: 'workout' | 'diet') => void; loading: boolean }) {
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

// ─── Macro bar ────────────────────────────────────────────────────────────────

function MacroBar({ label, g, pct, color }: { label: string; g: string; pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 200); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color }}>{g} · {pct}%</span>
      </div>
      <div className="macro-track">
        <div className="macro-fill" style={{ width: `${w}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Stat block (responsive grid item) ───────────────────────────────────────

function StatBlock({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="stat-block">
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--lime)', boxShadow: '0 0 12px rgba(200,241,53,0.6)' }} />}
      <p className="section-label">{label}</p>
      <p className="ob-stat-num ob-num-in" style={{ fontSize: 28, color: accent ? 'var(--lime)' : 'var(--ink)', textShadow: accent ? '0 0 20px rgba(200,241,53,0.3)' : 'none' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>{sub}</p>}
    </div>
  );
}

// ─── Advisory ────────────────────────────────────────────────────────────────

function Advisory({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(232,160,32,0.06)', borderLeft: '2px solid var(--amber)' }}>
      <span style={{ color: 'var(--amber)', fontSize: 13, flexShrink: 0, marginTop: 1 }}>△</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p className="section-label" style={{ color: 'var(--amber)', marginBottom: 4 }}>Advisory</p>
        {items.map((w, i) => <p key={i} style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>{w}</p>)}
      </div>
    </div>
  );
}

// ─── Workout output ───────────────────────────────────────────────────────────

function WorkoutOut({ plan }: { plan: WorkoutPlan }) {
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
                            <th>Coaching Cue</th>
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
                              <td style={{ fontSize: 12, maxWidth: 180, color: 'var(--ink-3)' }}>{ex.tips}</td>
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

// ─── Diet output ──────────────────────────────────────────────────────────────

function DietOut({ plan }: { plan: DietPlan }) {
  const [tab, setTab] = useState<'meals' | 'supplements' | 'avoid' | 'tips'>('meals');
  const [open, setOpen] = useState<number | null>(null);
  const [opt, setOpt] = useState<Record<number, number>>({});
  const { summary: s, mealPlan, supplements, avoidFoods, weeklyVariation: wv, warnings, tips } = plan;

  const p = parseInt(s.protein) || 0, c = parseInt(s.carbs) || 0, f = parseInt(s.fats) || 0;
  const tot = (p * 4) + (c * 4) + (f * 9);
  const pp = Math.round((p * 4 / tot) * 100), cp = Math.round((c * 4 / tot) * 100), fp = Math.round((f * 9 / tot) * 100);

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

        {/* MEALS */}
        {tab === 'meals' && (
          <div className="ob-fade" style={{ display: 'flex', flexDirection: 'column' }}>
            {mealPlan.map((meal, i) => {
              const chosen = opt[i] ?? 0, o = meal.options[chosen];
              return (
                <div key={i} className={`ob-row${open === i ? ' open' : ''}`} style={{ marginTop: i > 0 ? -1 : 0 }}>
                  <button onClick={() => setOpen(open === i ? null : i)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 14px', background: 'transparent', border: 'none', cursor: 'pointer', minHeight: 52 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, width: 34 }}>
                        <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, color: 'var(--lime)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {meal.meal.slice(0, 3)}
                        </p>
                        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--ink-3)' }}>{meal.time}</p>
                      </div>
                      <div style={{ width: 1, height: 26, background: 'var(--border-hi)', flexShrink: 0 }} />
                      <p style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.meal}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 10 }}>
                      {o && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink-3)' }}>{o.calories} kcal</span>}
                      <svg width="10" height="6" viewBox="0 0 10 6" style={{ transition: 'transform 0.22s', transform: open === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                        <path d="M1 1l4 4 4-4" stroke="var(--ink-3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                  </button>

                  {open === i && o && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 14px' }} className="ob-fade">
                      {meal.options.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                          {meal.options.map((op, oi) => (
                            <button key={oi} className={`ob-chip${chosen === oi ? ' on' : ''}`} style={{ fontSize: 11 }}
                              onClick={() => setOpt(p => ({ ...p, [i]: oi }))}>
                              OPT {oi + 1}: {op.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{o.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>{o.prepMinutes} min prep · {o.notes}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[[`${o.calories} kcal`, 'var(--ink-2)'], [`P ${o.protein}`, 'var(--lime)'], [`C ${o.carbs}`, 'var(--amber)'], [`F ${o.fats}`, '#60A5FA']].map(([l, c]) => (
                            <span key={l} className="ob-badge" style={{ background: `${c}14`, color: c as string, border: `1px solid ${c}28` }}>{l}</span>
                          ))}
                        </div>
                        <div>
                          <p className="section-label" style={{ marginBottom: 8 }}>Ingredients</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {o.ingredients.map((ing, j) => (
                              <span key={j} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--ink-3)' }}>{ing}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Weekly variation */}
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => (t + 1) % 25), 500); return () => clearInterval(id); }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '56px 16px', minHeight: 340 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
        {Array(25).fill(null).map((_, i) => (
          <div key={i} style={{ width: 4, height: 4, background: i === tick ? 'var(--lime)' : 'var(--bg-4)', transition: 'background 0.3s', boxShadow: i === tick ? '0 0 6px var(--lime)' : 'none' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: '0.1em', color: 'var(--ink)', marginBottom: 10 }}>
          AWAITING YOUR DATA
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 260, lineHeight: 1.8, margin: '0 auto' }}>
          Complete the form to generate your personalised performance protocol.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [wPlan, setWPlan] = useState<WorkoutPlan | null>(null);
  const [dPlan, setDPlan] = useState<DietPlan | null>(null);
  const [active, setActive] = useState<'workout' | 'diet' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useMount();

  const generate = async (data: Record<string, string>, ft: 'workout' | 'diet') => {
    setLoading(true); setError('');
    try {
      const url = ft === 'workout' ? '/api/generate/workout' : '/api/generate/diet';
      const { data: res } = await axios.post(url, data);
      if (!res.success) throw new Error(res.error);
      if (ft === 'workout') { setWPlan(res.plan); setActive('workout'); }
      else { setDPlan(res.plan); setActive('diet'); }
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
      <style>{STYLES}</style>

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