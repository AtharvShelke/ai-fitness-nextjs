// lib/helpers.ts — Hydrates lean LLM output into full plan structures
// Merges static data (warmup, cooldown, tips, progression) client-side

import {
    WARMUP_STEPS, COOLDOWN_STEPS, PROGRESSION_PLAN,
    getWorkoutTips, getDietTips
} from "./static-data";

/**
 * Calculate BMI, BMR, TDEE, and Target Calories from raw inputs.
 */
export function calculateMetrics(data: any) {
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
    const goalStr = (data.goal || '').toLowerCase();
    if (goalStr.includes('lose') || goalStr.includes('cut') || goalStr.includes('fat') || goalStr.includes('tone')) {
        cals -= 500;
    } else if (goalStr.includes('bulk') || goalStr.includes('build') || goalStr.includes('muscle')) {
        cals += 300;
    }
    cals = Math.round(cals / 50) * 50;

    return {
        bmi: parseFloat(bmi.toFixed(1)),
        bmiCategory: bmiCat,
        bmr,
        tdee,
        recommendedCalories: cals,
        dailyCalories: cals
    };
}

/**
 * Hydrate the lean LLM workout output into a full WorkoutPlan.
 * LLM outputs: { fitnessLevel, days[], warnings[] }
 * We add: summary metrics, warmup, cooldown, progressionPlan, tips
 */
export function getSafeWorkout(partial: any, metrics: any, goal?: string) {
    // Ensure metrics has defaults to prevent .toFixed errors
    const safeMetrics = {
        bmi: metrics?.bmi ?? 0,
        bmiCategory: metrics?.bmiCategory ?? 'Normal',
        bmr: metrics?.bmr ?? 0,
        tdee: metrics?.tdee ?? 0,
        recommendedCalories: metrics?.recommendedCalories ?? 0,
        ...metrics
    };
    // Clean out undefined from spread if they existed
    if (safeMetrics.bmi === undefined) safeMetrics.bmi = 0;
    if (safeMetrics.bmr === undefined) safeMetrics.bmr = 0;
    if (safeMetrics.tdee === undefined) safeMetrics.tdee = 0;
    if (safeMetrics.recommendedCalories === undefined) safeMetrics.recommendedCalories = 0;

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
            ...safeMetrics,
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
    const safeMetrics = {
        dailyCalories: metrics?.dailyCalories ?? 0,
        ...metrics
    };
    if (safeMetrics.dailyCalories === undefined) safeMetrics.dailyCalories = 0;

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
            ...safeMetrics,
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