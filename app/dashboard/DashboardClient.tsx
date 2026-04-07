'use client';

import { useState } from 'react';
import { WorkoutOut } from '@/components/WorkoutOut';
import { DietOut } from '@/components/DietOut';
import { getSafeWorkout, getSafeDiet, calculateMetrics } from '@/lib/helpers';

interface DashboardProps {
  user: { name: string; email: string };
  plans: { id: string; type: string; createdAt: string; data: any; inputData?: any }[];
  userMetrics: { height: number | null; weight: number | null; age: number | null; gender: string | null; goal: string | null };
}

export function DashboardClient({ user, plans, userMetrics }: DashboardProps) {
  const workoutPlans = plans.filter(p => p.type === 'workout');
  const dietPlans = plans.filter(p => p.type === 'diet');

  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');
  
  const activePlans = activeTab === 'workout' ? workoutPlans : dietPlans;

  return (
    <div className="ob-page" style={{ opacity: 1 }}>
      <div className="hero-strip" style={{ minHeight: 'auto', padding: '40px 28px' }}>
        <div className="hero-strip-bg" />
        <div className="hero-strip-inner" style={{ maxWidth: 800 }}>
          <div className="hero-eyebrow">
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--lime)', boxShadow: '0 0 12px var(--lime)',
            }} />
            <span className="fitness-badge">PROFILE DASHBOARD</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(40px, 6vw, 60px)' }}>
            WELCOME BACK,<br />
            <span className="accent">{user.name?.toUpperCase() || 'TRAINER'}</span>
          </h1>
          <p className="hero-subtitle">
            View your previously generated AI protocols below.
          </p>
        </div>
      </div>

      <div className="app-grid" style={{ maxWidth: 900, margin: '40px auto' }}>
        <div className="output-panel" style={{ width: '100%' }}>
          <div className="output-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 0 }}>
              <button
                className={`ob-tab${activeTab === 'workout' ? ' on' : ''}`}
                onClick={() => setActiveTab('workout')}
              >
                WORKOUT PROTOCOLS ({workoutPlans.length})
              </button>
              <button
                className={`ob-tab${activeTab === 'diet' ? ' on' : ''}`}
                onClick={() => setActiveTab('diet')}
              >
                NUTRITION PROTOCOLS ({dietPlans.length})
              </button>
            </div>
          </div>

          {activePlans.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-2)' }}>
              No {activeTab} plans found. Head back to the generator to create one!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 60 }}>
              {activePlans.map((plan, index) => (
                <div key={plan.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: 'var(--lime)', margin: 0, lineHeight: 1 }}>
                      PROTOCOL #{activePlans.length - index}
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: "'DM Mono',monospace" }}>
                      Generated on {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {plan.type === 'workout' ? (() => {
                    // Try to extract metrics from plan data, inputData, or user profile
                    const rawSummary = (plan.data as any)?.summary || {};
                    const hasRealValues = rawSummary.bmi && rawSummary.bmi > 0;
                    
                    const metrics = hasRealValues 
                      ? rawSummary 
                      : (plan.inputData ? calculateMetrics(plan.inputData) : calculateMetrics(userMetrics));

                    return (
                      <WorkoutOut plan={getSafeWorkout(
                        plan.data as any,
                        metrics,
                        metrics.goal || userMetrics.goal || ''
                      ) as any} />
                    );
                  })() : (() => {
                    const rawSummary = (plan.data as any)?.summary || {};
                    const needsHydration = !rawSummary.dailyCalories || rawSummary.dailyCalories === 0;
                    
                    const metrics = !needsHydration
                      ? rawSummary
                      : (plan.inputData ? calculateMetrics(plan.inputData) : calculateMetrics(userMetrics));

                    return (
                      <DietOut plan={getSafeDiet(
                        plan.data as any,
                        metrics,
                        userMetrics.goal || '',
                        ''
                      ) as any} />
                    );
                  })()}
                  
                  {index < activePlans.length - 1 && (
                    <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
