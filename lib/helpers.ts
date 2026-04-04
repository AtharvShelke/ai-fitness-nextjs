// lib/helpers.ts — Hydrates lean LLM output into full plan structures
// Merges static data (warmup, cooldown, tips, progression) client-side

import {
    WARMUP_STEPS, COOLDOWN_STEPS, PROGRESSION_PLAN,
    getWorkoutTips, getDietTips
} from "./static-data";

/**
 * Hydrate the lean LLM workout output into a full WorkoutPlan.
 * LLM outputs: { fitnessLevel, days[], warnings[] }
 * We add: summary metrics, warmup, cooldown, progressionPlan, tips
 */
export function getSafeWorkout(partial: any, metrics: any, goal?: string) {
    // LLM uses flat structure: { fitnessLevel, days: [...] }
    // We reshape to the UI's expected structure
    const days = (partial.days || partial.weeklySchedule || []).map((d: any) => ({
        day: d.day || '',
        type: d.type || 'rest',
        focus: d.focus || '',
        durationMinutes: d.durationMinutes || d.mins || 0,
        exercises: (d.exercises || []).map((ex: any) => ({
            name: ex.name || '',
            sets: ex.sets || 0,
            reps: ex.reps || '',
            rest: ex.rest || '',
            muscle: ex.muscle || '',
        })),
    }));

    return {
        summary: {
            ...metrics,
            fitnessLevel: partial.fitnessLevel || partial.summary?.fitnessLevel || 'Beginner',
        },
        weeklySchedule: days,
        warmup: WARMUP_STEPS,
        cooldown: COOLDOWN_STEPS,
        progressionPlan: PROGRESSION_PLAN,
        warnings: partial.warnings || [],
        tips: getWorkoutTips(goal || ''),
    };
}

/**
 * Hydrate the lean LLM diet output into a full DietPlan.
 * LLM outputs: { protein, carbs, fats, hydration, dietLabel, meals[], supplements[], avoidFoods[], refeedDay, lowCarbDay, warnings[] }
 * We add: summary with dailyCalories, weeklyVariation object, tips
 */
export function getSafeDiet(partial: any, metrics: any, goal?: string, dietType?: string) {
    // Handle both flat meals and legacy nested mealPlan.options
    let meals: any[] = [];
    if (partial.meals && Array.isArray(partial.meals)) {
        meals = partial.meals.map((m: any) => ({
            meal: m.meal || '',
            time: m.time || '',
            name: m.name || '',
            calories: m.calories || 0,
            protein: m.protein || '0g',
            carbs: m.carbs || '0g',
            fats: m.fats || '0g',
            prepMins: m.prepMins || m.prepMinutes || 0,
            ingredients: m.ingredients || [],
        }));
    } else if (partial.mealPlan && Array.isArray(partial.mealPlan)) {
        // Legacy format support: flatten options[0] into meal
        meals = partial.mealPlan.map((m: any) => {
            const opt = m.options?.[0] || {};
            return {
                meal: m.meal || '',
                time: m.time || '',
                name: opt.name || '',
                calories: opt.calories || 0,
                protein: opt.protein || '0g',
                carbs: opt.carbs || '0g',
                fats: opt.fats || '0g',
                prepMins: opt.prepMinutes || opt.prepMins || 0,
                ingredients: opt.ingredients || [],
            };
        });
    }

    return {
        summary: {
            dailyCalories: metrics.dailyCalories,
            protein: partial.protein || partial.summary?.protein || '0g',
            carbs: partial.carbs || partial.summary?.carbs || '0g',
            fats: partial.fats || partial.summary?.fats || '0g',
            hydration: partial.hydration || partial.summary?.hydration || '2.5L',
            dietLabel: partial.dietLabel || partial.summary?.dietLabel || '',
        },
        meals,
        supplements: (partial.supplements || []).map((s: any) => ({
            name: s.name || '', dose: s.dose || '', timing: s.timing || ''
        })),
        avoidFoods: partial.avoidFoods || [],
        weeklyVariation: {
            refeedDay: partial.refeedDay || partial.weeklyVariation?.refeedDay || '',
            lowCarbDay: partial.lowCarbDay || partial.weeklyVariation?.lowCarbDay || '',
        },
        warnings: partial.warnings || [],
        tips: getDietTips(goal || '', dietType || ''),
    };
}