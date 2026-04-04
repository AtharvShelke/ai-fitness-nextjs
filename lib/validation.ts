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
}

export function integrityCheckWorkout(parsed: any): IntegrityResult {
    const issues: string[] = [];
    const days = parsed.days || parsed.weeklySchedule || [];

    if (days.length < 7) {
        issues.push(`Only ${days.length}/7 days present`);
    }

    for (const day of days) {
        if (day.type === "training") {
            if (!day.exercises || day.exercises.length === 0) {
                issues.push(`${day.day}: training day with no exercises`);
            }
            for (const ex of (day.exercises || [])) {
                if (!ex.name) issues.push(`${day.day}: exercise missing name`);
                if (!ex.sets || ex.sets <= 0) issues.push(`${day.day}: ${ex.name || "?"} missing sets`);
            }
            if (!day.mins && !day.durationMinutes) {
                issues.push(`${day.day}: missing duration`);
            }
        }
    }

    return { passed: issues.length === 0, issues };
}

export function integrityCheckDiet(parsed: any): IntegrityResult {
    const issues: string[] = [];
    const meals = parsed.meals || [];

    if (meals.length < 3) {
        issues.push(`Only ${meals.length} meals (expected 3+)`);
    }

    for (const m of meals) {
        if (!m.name) issues.push(`${m.meal || "?"}: missing dish name`);
        if (!m.calories || m.calories <= 0) issues.push(`${m.meal || "?"}: missing calories`);
        if (!m.ingredients || m.ingredients.length === 0) {
            issues.push(`${m.meal || "?"}: missing ingredients`);
        }
    }

    if (!parsed.protein && !parsed.summary?.protein) issues.push("Missing macro: protein");
    if (!parsed.carbs && !parsed.summary?.carbs) issues.push("Missing macro: carbs");
    if (!parsed.fats && !parsed.summary?.fats) issues.push("Missing macro: fats");

    return { passed: issues.length === 0, issues };
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
