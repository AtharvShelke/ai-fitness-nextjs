// lib/validation.ts — Backend validation + integrity checks for LLM output
// Detects specifically which days/meals are missing instead of failing generically

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Meal slots derived from meal frequency input  
function getExpectedMeals(mealFrequency?: string): string[] {
    const freq = mealFrequency || "3+1 snack";
    if (freq.includes("5") || freq.includes("4+")) {
        return ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"];
    }
    if (freq.includes("4") || freq.includes("3+1")) {
        return ["Breakfast", "Lunch", "Snack", "Dinner"];
    }
    return ["Breakfast", "Lunch", "Dinner"];
}

// ── Workout validation ────────────────────────────────────────────────────────

export interface WorkoutValidation {
    valid: boolean;
    missingDays: string[];
    incompleteDays: string[];   // days with type=training but 0 exercises
    hasFitnessLevel: boolean;
    dayCount: number;
}

export function validateWorkout(parsed: any): WorkoutValidation {
    const days = parsed.days || parsed.weeklySchedule || [];
    const presentDays = new Set(
        days.map((d: any) => normalizeDayName(d.day || ""))
    );

    const missingDays = ALL_DAYS.filter(d => !presentDays.has(d));
    const incompleteDays = days
        .filter((d: any) =>
            (d.type === "training") &&
            (!d.exercises || d.exercises.length === 0)
        )
        .map((d: any) => normalizeDayName(d.day));

    const hasFitnessLevel = !!(parsed.fitnessLevel || parsed.summary?.fitnessLevel);

    return {
        valid: missingDays.length === 0 && incompleteDays.length === 0 && hasFitnessLevel,
        missingDays,
        incompleteDays,
        hasFitnessLevel,
        dayCount: days.length,
    };
}

// ── Diet validation ───────────────────────────────────────────────────────────

export interface DietValidation {
    valid: boolean;
    missingMeals: string[];
    incompleteMeals: string[];   // meals with no name or 0 calories
    hasMacros: boolean;
    mealCount: number;
}

export function validateDiet(parsed: any, mealFrequency?: string): DietValidation {
    const meals = parsed.meals || [];
    const expected = getExpectedMeals(mealFrequency);

    const presentMeals = new Set(
        meals.map((m: any) => normalizeMealName(m.meal || ""))
    );
    const missingMeals = expected.filter(e => !presentMeals.has(normalizeMealName(e)));

    const incompleteMeals = meals
        .filter((m: any) => !m.name || m.calories === 0 || m.calories === undefined)
        .map((m: any) => normalizeMealName(m.meal));

    const hasMacros = !!(parsed.protein && parsed.carbs && parsed.fats);

    return {
        valid: missingMeals.length === 0 && incompleteMeals.length === 0 && hasMacros,
        missingMeals,
        incompleteMeals,
        hasMacros,
        mealCount: meals.length,
    };
}

// ── Integrity check (final sanity before sending to client) ───────────────────

export interface IntegrityResult {
    passed: boolean;
    issues: string[];
    criticalFailures: string[]; // Strict semantic rules that force LLM auto-correction
}

export function integrityCheckWorkout(parsed: any, maxSetsPerDay: number = 30): IntegrityResult {
    const issues: string[] = [];
    const criticalFailures: string[] = [];
    const days = parsed.days || parsed.weeklySchedule || [];

    if (days.length < 7) {
        criticalFailures.push(`Only ${days.length}/7 days present. All 7 days must be generated.`);
    }

    for (const day of days) {
        if (day.type === "training") {
            if (!day.exercises || day.exercises.length === 0) {
                issues.push(`${day.day}: training day with no exercises`);
            }
            
            let totalSets = 0;
            for (const ex of (day.exercises || [])) {
                if (!ex.name) issues.push(`${day.day}: exercise missing name`);
                if (!ex.sets || ex.sets <= 0) issues.push(`${day.day}: ${ex.name || "?"} missing sets`);
                totalSets += (Number(ex.sets) || 0);
            }
            
            if (totalSets > maxSetsPerDay) {
                criticalFailures.push(`${day.day}: Excessive volume. Total sets (${totalSets}) exceeds safety limit (${maxSetsPerDay}). Reduce number of exercises or sets.`);
            }

            if (!day.mins && !day.durationMinutes) {
                issues.push(`${day.day}: missing duration`);
            }
        }
    }

    return { passed: criticalFailures.length === 0 && issues.length === 0, issues, criticalFailures };
}

export function integrityCheckDiet(parsed: any, targetCals?: number): IntegrityResult {
    const issues: string[] = [];
    const criticalFailures: string[] = [];
    const meals = parsed.meals || [];

    if (meals.length < 3) {
        criticalFailures.push(`Only ${meals.length} meals generated (expected 3+).`);
    }

    let calculatedTotalCals = 0;

    for (const m of meals) {
        if (!m.name) issues.push(`${m.meal || "?"}: missing dish name`);
        if (!m.calories || m.calories <= 0) {
            issues.push(`${m.meal || "?"}: missing calories`);
        } else {
            calculatedTotalCals += (Number(m.calories) || 0);
        }
        
        if (!m.ingredients || m.ingredients.length === 0) {
            issues.push(`${m.meal || "?"}: missing ingredients`);
        }
    }

    if (targetCals) {
        const upperLimit = targetCals * 1.15; // 15% variance
        const lowerLimit = targetCals * 0.85;
        
        if (calculatedTotalCals > upperLimit) {
            criticalFailures.push(`Total calories (${calculatedTotalCals} kcal) drastically exceeds user target (${targetCals} kcal). You MUST reduce portion sizes or remove high-calorie items.`);
        } else if (calculatedTotalCals < lowerLimit) {
            criticalFailures.push(`Total calories (${calculatedTotalCals} kcal) falls severely short of user target (${targetCals} kcal). You MUST increase portions or add calorie-dense foods.`);
        }
    }

    if (!parsed.protein && !parsed.summary?.protein) issues.push("Missing macro: protein");
    if (!parsed.carbs && !parsed.summary?.carbs) issues.push("Missing macro: carbs");
    if (!parsed.fats && !parsed.summary?.fats) issues.push("Missing macro: fats");

    return { passed: criticalFailures.length === 0 && issues.length === 0, issues, criticalFailures };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDayName(d: string): string {
    const map: Record<string, string> = {
        "monday": "Mon", "mon": "Mon",
        "tuesday": "Tue", "tue": "Tue",
        "wednesday": "Wed", "wed": "Wed",
        "thursday": "Thu", "thu": "Thu",
        "friday": "Fri", "fri": "Fri",
        "saturday": "Sat", "sat": "Sat",
        "sunday": "Sun", "sun": "Sun",
    };
    return map[d.toLowerCase()] || d.slice(0, 3);
}

function normalizeMealName(m: string): string {
    const lower = m.toLowerCase();
    if (lower.includes("breakfast")) return "Breakfast";
    if (lower.includes("morning") && lower.includes("snack")) return "Morning Snack";
    if (lower.includes("lunch")) return "Lunch";
    if (lower.includes("afternoon") && lower.includes("snack")) return "Afternoon Snack";
    if (lower.includes("snack")) return "Snack";
    if (lower.includes("dinner")) return "Dinner";
    return m;
}

export { ALL_DAYS, getExpectedMeals, normalizeDayName, normalizeMealName };
