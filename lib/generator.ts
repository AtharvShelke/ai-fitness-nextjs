// lib/generator.ts — UPDATED: enriched prompts with new input fields
// Only buildWorkoutPrompt and buildDietPrompt are changed; all other logic is preserved.

import { GoogleGenAI } from "@google/genai";
import { unitCacheKey, getCached, setCache } from "./cache";
import {
    validateWorkout, validateDiet,
    integrityCheckWorkout, integrityCheckDiet,
    ALL_DAYS,
    type WorkoutValidation, type DietValidation,
} from "./validation";


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const BASE_CONFIG = { maxOutputTokens: 8192, temperature: 0.9, topP: 0.95 };
const MAX_RETRIES = 2;

// ── Logging ───────────────────────────────────────────────────────────────────

interface GenerationLog {
    type: string;
    unit: string;
    attempt: number;
    success: boolean;
    durationMs: number;
    error?: string;
}

const logs: GenerationLog[] = [];

export function getGenerationLogs(): GenerationLog[] {
    return logs.slice(-100);
}

function logGen(entry: GenerationLog) {
    logs.push(entry);
    if (logs.length > 200) logs.splice(0, 100);
    const status = entry.success ? "✓" : "✗";
    console.log(
        `[gen] ${status} ${entry.type}/${entry.unit} attempt=${entry.attempt} ${entry.durationMs}ms${entry.error ? " err=" + entry.error : ""}`
    );
}

// ── Core LLM call ─────────────────────────────────────────────────────────────

async function callLLM(prompt: string, model = "gemini-2.5-flash"): Promise<string> {
    try {
        const result = await ai.models.generateContent({
            model,
            config: BASE_CONFIG,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        return result.text || "";
    } catch (err) {
        console.warn("[gen] Primary model failed, trying fallback:", err);
        const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            config: {
                ...BASE_CONFIG,
                thinkingConfig: { thinkingBudget: 512 },
            },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        return result.text || "";
    }
}

function cleanAndParse(raw: string): unknown {
    const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/g, "")
        .trim();
    if (!cleaned) return null;
    try {
        return JSON.parse(cleaned);
    } catch {
        const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) {
            try { return JSON.parse(match[1]); } catch { }
        }
        return null;
    }
}

// ── Day plan builder (unchanged) ──────────────────────────────────────────────

function buildDayPlan(workoutDays: number): { day: string; dayType: string }[] {
    const plans: Record<number, string[]> = {
        2: ["training", "rest", "rest", "training", "rest", "rest", "rest"],
        3: ["training", "rest", "training", "rest", "training", "rest", "rest"],
        4: ["training", "rest", "training", "rest", "training", "training", "rest"],
        5: ["training", "rest", "training", "training", "rest", "training", "training"],
        6: ["training", "training", "training", "rest", "training", "training", "training"],
        7: ["training", "training", "training", "active_recovery", "training", "training", "training"],
    };
    const pattern = plans[workoutDays] || plans[3];
    return ALL_DAYS.map((day, i) => ({ day, dayType: pattern[i] || "rest" }));
}

// ══════════════════════════════════════════════════════════════════════════════
//  WORKOUT — enriched prompt
// ══════════════════════════════════════════════════════════════════════════════

function buildWorkoutPrompt(body: GenerationBody): string {
    const {
        height, weight, gender, age, goal, healthConditions,
        workoutDaysPerWeek, bmi, bmiCategory, bmr, tdee, recommendedCalories,
        // NEW fields (all optional — safe defaults applied)
        targetWeight, timeline, fitnessLevel, activityLevel,
        sessionDuration, trainingLocation, sleepDuration, stressLevel,
    } = body;

    const workoutDays = parseInt(workoutDaysPerWeek || "3");
    const dayPlan = buildDayPlan(workoutDays);

    const daySchedule = dayPlan
        .map(({ day, dayType }) => `${day}: ${dayType}`)
        .join(" | ");

    const trainingDays = dayPlan.filter(d => d.dayType === "training").map(d => d.day);
    const muscleGroups = getMuscleGroupRotation(workoutDays, goal);
    const muscleAssignment = trainingDays
        .map((day, i) => `${day} → ${muscleGroups[i] || "Full Body"}`)
        .join(", ");

    // Build optional context lines — omit if empty
    const optionalContext = [
        targetWeight ? `- Target weight: ${targetWeight}` : null,
        timeline ? `- Timeline: ${timeline}` : null,
        fitnessLevel ? `- Self-reported fitness level: ${fitnessLevel}` : null,
        activityLevel ? `- Daily activity level: ${activityLevel}` : null,
        sessionDuration ? `- Preferred session duration: ${sessionDuration}` : null,
        trainingLocation ? `- Training location: ${trainingLocation}` : null,
        sleepDuration ? `- Sleep per night: ${sleepDuration}` : null,
        stressLevel ? `- Stress level: ${stressLevel} (adjust recovery emphasis accordingly)` : null,
    ].filter(Boolean).join("\n");

    // Location-aware equipment note
    const equipmentNote = trainingLocation === "Home"
        ? "EQUIPMENT: Home setting — use bodyweight, dumbbells, resistance bands only. No barbells or machines."
        : trainingLocation === "Outdoors"
            ? "EQUIPMENT: Outdoor setting — use bodyweight, running, and park-based exercises only."
            : trainingLocation === "Mixed"
                ? "EQUIPMENT: Mixed setting — alternate between gym and bodyweight exercises."
                : "EQUIPMENT: Full gym access — use free weights, cables, and machines as appropriate.";

    // Sleep/stress recovery note
    const recoveryNote = (sleepDuration === "< 5 hrs" || sleepDuration === "5–6 hrs" || stressLevel === "High")
        ? "RECOVERY NOTE: User has poor sleep or high stress — reduce volume/intensity, add extra rest days if needed, prioritise compound lifts over isolation."
        : "";

    return `You are an elite personal trainer creating a COMPLETE, COHERENT weekly workout plan.

USER PROFILE:
- Body: ${height ?? "?"}cm, ${weight ?? "?"}kg, ${gender ?? "unspecified"}, ${age ?? "?"} years old
- Goal: ${goal ?? "General Fitness"}
- Fitness metrics: BMI ${bmi ?? "?"} (${bmiCategory ?? "?"}) | BMR: ${bmr ?? "?"} kcal | TDEE: ${tdee ?? "?"} kcal | Target: ${recommendedCalories ?? "?"} kcal/day
- Training frequency: ${workoutDays} days/week
- Health conditions: ${healthConditions || "None"}
${optionalContext ? `\nADDITIONAL CONTEXT:\n${optionalContext}` : ""}

${equipmentNote}
${recoveryNote}

WEEKLY SCHEDULE (FIXED — do NOT change these day types):
${daySchedule}

MUSCLE GROUP ROTATION (follow this exactly to avoid repeating the same muscles):
${muscleAssignment}

CRITICAL RULES — your output will be REJECTED if you break these:
1. Every training day MUST have DIFFERENT exercises than every other training day.
2. Follow the muscle group rotation above — do NOT put chest exercises on a back day.
3. Each training day needs 4-6 exercises appropriate for that specific muscle group.
4. Exercise variety: if you use Bench Press on one day, do NOT use it again any other day.
5. Rest days and active_recovery days must have an EMPTY exercises array.
6. All 7 days (Mon through Sun) must be present in the output.
7. Sets, reps, rest periods, and exercise selection must reflect the training location and session duration.
8. If fitnessLevel is provided, use it directly instead of re-deriving it.

DETERMINE FITNESS LEVEL: ${fitnessLevel || "Derive from profile (Beginner / Intermediate / Advanced)"}.

Return ONLY valid JSON, no markdown, no explanation:
{
  "fitnessLevel": "<Beginner|Intermediate|Advanced>",
  "warnings": ["<health caution if any — empty array if none>"],
  "days": [
    {
      "day": "<Mon|Tue|Wed|Thu|Fri|Sat|Sun>",
      "type": "<training|rest|active_recovery>",
      "focus": "<specific muscle group e.g. 'Chest & Triceps' — or 'Rest Day' — or 'Active Recovery'>",
      "mins": <number — 0 for rest/recovery>,
      "exercises": [
        {
          "name": "<exercise name>",
          "sets": <number>,
          "reps": "<e.g. 8-10 or 30s>",
          "rest": "<e.g. 60s>",
          "muscle": "<primary muscle targeted>"
        }
      ]
    }
  ]
}`;
}

/** Returns muscle group rotation based on days per week and goal */
function getMuscleGroupRotation(days: number, goal?: string): string[] {
    const isStrength = goal?.includes("Strength");
    const isEndurance = goal?.includes("Endurance");

    const rotations: Record<number, string[]> = {
        2: ["Upper Body (Chest, Shoulders, Triceps)", "Lower Body (Quads, Hamstrings, Glutes, Calves)"],
        3: ["Push (Chest, Shoulders, Triceps)", "Pull (Back, Biceps, Rear Delts)", "Legs (Quads, Hamstrings, Glutes, Calves)"],
        4: ["Chest & Triceps", "Back & Biceps", "Shoulders & Core", "Legs (Quads, Hamstrings, Glutes)"],
        5: ["Chest & Triceps", "Back & Biceps", "Legs (Quads, Hamstrings)", "Shoulders & Core", "Glutes, Calves & Arms"],
        6: ["Chest & Triceps", "Back & Biceps", "Legs (Quads, Hamstrings)", "Shoulders & Traps", "Chest & Core (lighter)", "Glutes, Calves & Arms"],
    };

    if (isStrength) {
        const strengthRotations: Record<number, string[]> = {
            3: ["Squat focus (Legs + Core)", "Press focus (Chest + Shoulders + Triceps)", "Hinge focus (Back + Hamstrings + Biceps)"],
            4: ["Squat focus", "Press focus", "Deadlift / Hinge focus", "Overhead Press + Arms"],
            5: ["Squat focus", "Press focus", "Deadlift focus", "Overhead Press + Core", "Accessory (Arms, Calves, Grip)"],
        };
        return strengthRotations[days] || rotations[days] || ["Full Body"];
    }

    if (isEndurance) {
        return Array(days).fill("").map((_, i) => {
            const opts = ["Full Body Circuit", "Lower Body Endurance", "Upper Body Endurance", "HIIT + Core", "Full Body Metabolic", "Lower Body Power", "Upper Body Power"];
            return opts[i % opts.length];
        });
    }

    return rotations[days] || ["Full Body"];
}

async function generateWorkoutWithRetry(
    body: GenerationBody,
    prompt: string,
    attempt = 1
): Promise<unknown> {
    const t0 = Date.now();
    try {
        const raw = await callLLM(prompt);
        const parsed = cleanAndParse(raw) as Record<string, unknown> | null;
        const dt = Date.now() - t0;

        if (!parsed || !Array.isArray(parsed.days) || (parsed.days as unknown[]).length < 7) {
            logGen({ type: "workout", unit: "full_plan", attempt, success: false, durationMs: dt, error: "incomplete_plan" });
            if (attempt <= MAX_RETRIES) return generateWorkoutWithRetry(body, prompt, attempt + 1);
            return null;
        }

        const trainingDays = (parsed.days as Array<Record<string, unknown>>).filter(d => d.type === "training");
        const exerciseNames = trainingDays.flatMap(d =>
            ((d.exercises as Array<Record<string, unknown>>) || []).map(e => (e.name as string)?.toLowerCase())
        );
        const dupes = exerciseNames.filter((name, i) => exerciseNames.indexOf(name) !== i);

        if (dupes.length > 2) {
            logGen({ type: "workout", unit: "full_plan", attempt, success: false, durationMs: dt, error: `exercise_duplication: ${dupes.slice(0, 3).join(",")}` });
            if (attempt <= MAX_RETRIES) {
                const correctivePrompt = prompt + `\n\n[SYSTEM FEEDBACK]: Your last output contained duplicated exercises. You must use different exercises every day.`;
                return generateWorkoutWithRetry(body, correctivePrompt, attempt + 1);
            }
            return null;
        }
        
        // --- SEMANTIC EVALUATION LAYER ---
        const integrity = integrityCheckWorkout(parsed);
        if (!integrity.passed && integrity.criticalFailures.length > 0) {
            logGen({ type: "workout", unit: "full_plan", attempt, success: false, durationMs: dt, error: `semantic_failure: ${integrity.criticalFailures.join(" | ")}` });
            
            if (attempt <= MAX_RETRIES) {
                const correctivePrompt = prompt + `\n\n[SYSTEM FEEDBACK ON YOUR PREVIOUS ATTEMPT]:\nYour last submission failed strict safety evaluation for these reasons:\n${integrity.criticalFailures.map(f => "- " + f).join('\n')}\n\nYou must aggressively rewrite the plan to strictly adhere to the safety parameters.`;
                return generateWorkoutWithRetry(body, correctivePrompt, attempt + 1);
            }
            return null;
        }

        logGen({ type: "workout", unit: "full_plan", attempt, success: true, durationMs: dt });
        return parsed;
    } catch (err) {
        const dt = Date.now() - t0;
        logGen({ type: "workout", unit: "full_plan", attempt, success: false, durationMs: dt, error: (err as Error).message });
        if (attempt <= MAX_RETRIES) return generateWorkoutWithRetry(body, prompt, attempt + 1);
        return null;
    }
}

export async function generateFullWorkout(
    body: GenerationBody,
    cacheBase: string,
    onProgress?: (unitsDone: number, totalUnits: number, latestDay: unknown) => void
): Promise<{ plan: unknown; validation: WorkoutValidation; integrity: unknown; logs: GenerationLog[] }> {
    const workoutDays = parseInt(body.workoutDaysPerWeek || "3");
    const dayPlan = buildDayPlan(workoutDays);

    if (onProgress) onProgress(0, 7, { day: "Generating..." });

    const initialPrompt = buildWorkoutPrompt(body);
    const parsed = await generateWorkoutWithRetry(body, initialPrompt) as Record<string, unknown> | null;

    if (!parsed) {
        const fallbackPlan = {
            fitnessLevel: body.fitnessLevel || "Beginner",
            warnings: ["Plan generation failed — showing default template. Please try again."],
            days: dayPlan.map(({ day, dayType }) => fallbackDay(day, dayType)),
        };
        const validation = validateWorkout(fallbackPlan);
        const integrity = integrityCheckWorkout(fallbackPlan);
        return { plan: fallbackPlan, validation, integrity, logs: getGenerationLogs() };
    }

    const dayMap = new Map<string, unknown>();
    for (const d of parsed.days as Array<Record<string, unknown>>) {
        const normalKey = normalizeDayKey(d.day as string);
        if (normalKey) dayMap.set(normalKey, { ...d, day: normalKey });
    }

    for (const { day, dayType } of dayPlan) {
        if (!dayMap.has(day)) {
            dayMap.set(day, fallbackDay(day, dayType));
        }
    }

    parsed.days = ALL_DAYS.map(d => dayMap.get(d)).filter(Boolean);

    if (onProgress) {
        for (let i = 0; i < (parsed.days as unknown[]).length; i++) {
            onProgress(i + 1, 7, (parsed.days as unknown[])[i]);
        }
    }

    const validation = validateWorkout(parsed);
    const integrity = integrityCheckWorkout(parsed);

    return { plan: parsed, validation, integrity, logs: getGenerationLogs() };
}

function normalizeDayKey(d: string): string | null {
    const map: Record<string, string> = {
        "monday": "Mon", "mon": "Mon",
        "tuesday": "Tue", "tue": "Tue",
        "wednesday": "Wed", "wed": "Wed",
        "thursday": "Thu", "thu": "Thu",
        "friday": "Fri", "fri": "Fri",
        "saturday": "Sat", "sat": "Sat",
        "sunday": "Sun", "sun": "Sun",
    };
    return map[d?.toLowerCase()] || (d?.length === 3 ? d : null);
}

function fallbackDay(day: string, dayType: string): unknown {
    if (dayType === "rest") {
        return { day, type: "rest", focus: "Rest Day", mins: 0, exercises: [] };
    }
    if (dayType === "active_recovery") {
        return { day, type: "active_recovery", focus: "Active Recovery", mins: 30, exercises: [] };
    }
    return {
        day, type: "training", focus: "Full Body", mins: 45,
        exercises: [
            { name: "Bodyweight Squats", sets: 3, reps: "12-15", rest: "60s", muscle: "Quadriceps" },
            { name: "Push-ups", sets: 3, reps: "10-12", rest: "60s", muscle: "Chest" },
            { name: "Dumbbell Rows", sets: 3, reps: "10-12", rest: "60s", muscle: "Back" },
            { name: "Plank", sets: 3, reps: "30-45s", rest: "45s", muscle: "Core" },
        ],
    };
}


// ══════════════════════════════════════════════════════════════════════════════
//  DIET — enriched prompt
// ══════════════════════════════════════════════════════════════════════════════

function getExpectedMealSlots(mealFrequency?: string): string[] {
    const freq = mealFrequency || "3+1 snack";
    if (freq.includes("5") || freq.includes("4+")) {
        return ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"];
    }
    if (freq.includes("4") || freq.includes("3+1")) {
        return ["Breakfast", "Lunch", "Snack", "Dinner"];
    }
    return ["Breakfast", "Lunch", "Dinner"];
}

function buildDietPrompt(body: GenerationBody): string {
    const {
        height, weight, gender, age, goal, healthConditions,
        dietType, allergies, mealFrequency, foodRestrictions,
        bmi, bmiCategory, tdee, dailyCalories,
        // NEW fields
        targetWeight, timeline, fitnessLevel, activityLevel,
        sleepDuration, stressLevel, caloricPreference,
    } = body;

    const mealSlots = getExpectedMealSlots(mealFrequency);

    const cals = Number(dailyCalories) || 2000;
    const calBreakdown = mealSlots.map(slot => {
        const lower = slot.toLowerCase();
        let pct = 1 / mealSlots.length;
        if (lower.includes("snack")) pct = 0.10;
        else if (lower.includes("breakfast")) pct = 0.25;
        else if (lower.includes("lunch")) pct = 0.35;
        else if (lower.includes("dinner")) pct = 0.30;
        return `${slot}: ~${Math.round(cals * pct)} kcal`;
    }).join(", ");

    const optionalContext = [
        targetWeight ? `- Target weight: ${targetWeight}` : null,
        timeline ? `- Goal timeline: ${timeline}` : null,
        fitnessLevel ? `- Fitness level: ${fitnessLevel}` : null,
        activityLevel ? `- Activity level: ${activityLevel} (affects TDEE multiplier)` : null,
        caloricPreference ? `- Caloric preference: ${caloricPreference}` : null,
        sleepDuration ? `- Sleep per night: ${sleepDuration}` : null,
        stressLevel ? `- Stress level: ${stressLevel}` : null,
    ].filter(Boolean).join("\n");

    // Stress/sleep cortisol note
    const cortisolNote = (stressLevel === "High" || sleepDuration === "< 5 hrs" || sleepDuration === "5–6 hrs")
        ? "LIFESTYLE NOTE: High stress or poor sleep elevates cortisol — include magnesium-rich foods, complex carbs in the evening, and avoid stimulants after 2 PM. Adjust supplement recommendations accordingly."
        : "";

    return `You are an expert certified nutritionist creating a COMPLETE, COHERENT daily meal plan.

USER PROFILE:
- Body: ${height ?? "?"}cm, ${weight ?? "?"}kg, ${gender ?? "unspecified"}, ${age ?? "?"} years old
- Goal: ${goal ?? "General Health"}
- Metrics: BMI ${bmi ?? "?"} (${bmiCategory ?? "?"}) | TDEE: ${tdee ?? "?"} kcal | Daily target: ${dailyCalories ?? "2000"} kcal
- Diet style: ${dietType || "Balanced"}
- Allergies: ${allergies || "None"}
- Food restrictions: ${foodRestrictions || "None"}
- Meal frequency: ${mealFrequency || "3 meals + 1 snack"}
- Health conditions: ${healthConditions || "None"}
${optionalContext ? `\nADDITIONAL CONTEXT:\n${optionalContext}` : ""}
${cortisolNote ? `\n${cortisolNote}` : ""}

REQUIRED MEAL SLOTS (all must be present): ${mealSlots.join(", ")}
CALORIE DISTRIBUTION GUIDELINE: ${calBreakdown}

CRITICAL RULES — output will be REJECTED if broken:
1. Every meal MUST have a DIFFERENT dish name — no repeated foods across meals.
2. Each meal's ingredients must be specific to that meal's dish — no copy-paste.
3. Meal names must be concrete dishes (e.g. "Masala Omelette with Whole Wheat Toast") not generic labels.
4. Calories for each meal must be realistic (snacks ~100-200 kcal, mains ~400-700 kcal).
5. Ingredients list must be detailed with quantities for each meal.
6. Macros (protein/carbs/fats) must be present for every single meal.
7. All meals must strictly respect allergies and dietary restrictions above.
8. Total daily calories across all meals should add up close to ${dailyCalories ?? "2000"} kcal.
9. If the user has high stress or poor sleep, include stress-relieving and sleep-supporting foods.
10. Adjust protein targets upward if the goal is Muscle Gain and include adequate leucine-rich sources.

Return ONLY valid JSON, no markdown, no explanation:
{
  "protein": "<total daily protein e.g. 150g>",
  "carbs": "<total daily carbs e.g. 200g>",
  "fats": "<total daily fats e.g. 65g>",
  "hydration": "<daily water target e.g. 3.0L>",
  "dietLabel": "<short descriptive label e.g. 'High-Protein Balanced'>",
  "meals": [
    {
      "meal": "<exact slot name from the required list above>",
      "time": "<suggested time e.g. 7:30 AM>",
      "name": "<specific dish name>",
      "calories": <number>,
      "protein": "<Xg>",
      "carbs": "<Xg>",
      "fats": "<Xg>",
      "prepMins": <number>,
      "ingredients": ["<ingredient with quantity>", "..."]
    }
  ],
  "supplements": [
    { "name": "<supplement>", "dose": "<dose>", "timing": "<when to take>" }
  ],
  "avoidFoods": ["<food to avoid and why>"],
  "refeedDay": "<suggested refeed day and calorie adjustment>",
  "lowCarbDay": "<suggested low-carb day and adjustment>",
  "warnings": ["<important dietary caution — empty array if none>"]
}`;
}

async function generateDietWithRetry(
    body: GenerationBody,
    prompt: string,
    attempt = 1
): Promise<unknown> {
    const t0 = Date.now();
    try {
        const raw = await callLLM(prompt);
        const parsed = cleanAndParse(raw) as Record<string, unknown> | null;
        const dt = Date.now() - t0;

        if (!parsed || !Array.isArray(parsed.meals) || (parsed.meals as unknown[]).length === 0) {
            logGen({ type: "diet", unit: "full_plan", attempt, success: false, durationMs: dt, error: "no_meals" });
            if (attempt <= MAX_RETRIES) return generateDietWithRetry(body, prompt, attempt + 1);
            return null;
        }

        const mealNames = (parsed.meals as Array<Record<string, unknown>>).map(m => (m.name as string)?.toLowerCase()).filter(Boolean);
        const dupes = mealNames.filter((name, i) => mealNames.indexOf(name) !== i);

        if (dupes.length > 0) {
            logGen({ type: "diet", unit: "full_plan", attempt, success: false, durationMs: dt, error: `meal_duplication: ${dupes.join(",")}` });
            if (attempt <= MAX_RETRIES) {
                const correctivePrompt = prompt + `\n\n[SYSTEM FEEDBACK]: Your last output duplicated the names of meals. All meals must have unique dish names.`;
                return generateDietWithRetry(body, correctivePrompt, attempt + 1);
            }
            return null;
        }
        
        // --- SEMANTIC EVALUATION LAYER ---
        const userTargetCals = Number(body.dailyCalories) || Number(body.recommendedCalories) || 0;
        // Only run strict calorie check if a target calculation was passed
        if (userTargetCals > 0) {
             const integrity = integrityCheckDiet(parsed, userTargetCals);
             if (!integrity.passed && integrity.criticalFailures.length > 0) {
                 logGen({ type: "diet", unit: "full_plan", attempt, success: false, durationMs: dt, error: `semantic_failure: ${integrity.criticalFailures.join(" | ")}` });
                 
                 if (attempt <= MAX_RETRIES) {
                     const correctivePrompt = prompt + `\n\n[SYSTEM FEEDBACK ON YOUR PREVIOUS ATTEMPT]:\nYour last submission mathematically failed evaluation for the following reasons:\n${integrity.criticalFailures.map(f => "- " + f).join('\n')}\n\nAdjust your portion sizes, ingredient quantities, and calculations to strictly resolve these issues.`;
                     return generateDietWithRetry(body, correctivePrompt, attempt + 1);
                 }
                 return null;
             }
        }

        logGen({ type: "diet", unit: "full_plan", attempt, success: true, durationMs: dt });
        return parsed;
    } catch (err) {
        const dt = Date.now() - t0;
        logGen({ type: "diet", unit: "full_plan", attempt, success: false, durationMs: dt, error: (err as Error).message });
        if (attempt <= MAX_RETRIES) return generateDietWithRetry(body, prompt, attempt + 1);
        return null;
    }
}

export async function generateFullDiet(
    body: GenerationBody,
    cacheBase: string,
    mealSlots: string[],
    onProgress?: (unitsDone: number, totalUnits: number, latestMeal: unknown) => void
): Promise<{ plan: unknown; validation: DietValidation; integrity: unknown; logs: GenerationLog[] }> {
    if (onProgress) onProgress(0, mealSlots.length, { meal: "Generating..." });

    const initialPrompt = buildDietPrompt(body);
    const parsed = await generateDietWithRetry(body, initialPrompt) as Record<string, unknown> | null;

    if (!parsed) {
        const fallbackPlan = {
            protein: "0g", carbs: "0g", fats: "0g",
            hydration: "2.5L", dietLabel: "Balanced",
            meals: mealSlots.map(slot => fallbackMeal(slot, Math.round(2000 / mealSlots.length))),
            supplements: [], avoidFoods: [], refeedDay: "", lowCarbDay: "",
            warnings: ["Plan generation failed — showing default template. Please try again."],
        };
        const validation = validateDiet(fallbackPlan, body.mealFrequency);
        const integrity = integrityCheckDiet(fallbackPlan);
        return { plan: fallbackPlan, validation, integrity, logs: getGenerationLogs() };
    }

    const existingSlots = new Set((parsed.meals as Array<Record<string, unknown>>).map(m => m.meal));
    for (const slot of mealSlots) {
        if (!existingSlots.has(slot)) {
            (parsed.meals as unknown[]).push(fallbackMeal(slot, Math.round((Number(body.dailyCalories) || 2000) / mealSlots.length)));
        }
    }

    const slotOrder = new Map(mealSlots.map((s, i) => [s, i]));
    (parsed.meals as Array<Record<string, unknown>>).sort((a, b) => {
        const ai = slotOrder.get(a.meal as string) ?? 99;
        const bi = slotOrder.get(b.meal as string) ?? 99;
        return ai - bi;
    });

    if (onProgress) {
        for (let i = 0; i < (parsed.meals as unknown[]).length; i++) {
            onProgress(i + 1, mealSlots.length, (parsed.meals as unknown[])[i]);
        }
    }

    const validation = validateDiet(parsed, body.mealFrequency);
    const integrity = integrityCheckDiet(parsed);

    return { plan: parsed, validation, integrity, logs: getGenerationLogs() };
}

function fallbackMeal(mealSlot: string, calorieBudget: number): unknown {
    const lower = mealSlot.toLowerCase();
    if (lower.includes("snack")) {
        return {
            meal: mealSlot, time: lower.includes("morning") ? "10:30 AM" : "3:30 PM",
            name: "Greek Yogurt with Mixed Nuts", calories: calorieBudget,
            protein: "15g", carbs: "12g", fats: "8g", prepMins: 2,
            ingredients: ["150g Greek yogurt", "20g mixed nuts", "1 tsp honey"],
        };
    }
    if (lower.includes("breakfast")) {
        return {
            meal: mealSlot, time: "7:30 AM",
            name: "Oatmeal with Banana & Protein", calories: calorieBudget,
            protein: "25g", carbs: "45g", fats: "8g", prepMins: 10,
            ingredients: ["80g oats", "1 banana", "1 scoop protein powder", "200ml milk"],
        };
    }
    return {
        meal: mealSlot, time: lower.includes("lunch") ? "12:30 PM" : "7:00 PM",
        name: "Grilled Chicken with Rice & Vegetables", calories: calorieBudget,
        protein: "35g", carbs: "40g", fats: "12g", prepMins: 25,
        ingredients: ["150g chicken breast", "100g rice", "100g mixed vegetables", "1 tbsp olive oil"],
    };
}


// ══════════════════════════════════════════════════════════════════════════════
//  RECOVERY — kept for compatibility
// ══════════════════════════════════════════════════════════════════════════════

export async function recoverWorkoutDays(
    body: GenerationBody,
    missingDays: string[],
    cacheBase: string
): Promise<unknown[]> {
    const prompt = buildWorkoutPrompt(body);
    const result = await generateWorkoutWithRetry(body, prompt) as Record<string, unknown> | null;
    if (!result) return missingDays.map(day => fallbackDay(day, "training"));

    return missingDays.map(day => {
        const found = (result.days as Array<Record<string, unknown>>)?.find(d =>
            normalizeDayKey(d.day as string) === day
        );
        return found || fallbackDay(day, "training");
    });
}

export async function recoverDietMeals(
    body: GenerationBody,
    missingMeals: string[],
    cacheBase: string
): Promise<unknown[]> {
    const prompt = buildDietPrompt(body);
    const result = await generateDietWithRetry(body, prompt) as Record<string, unknown> | null;
    if (!result) {
        const totalCals = Number(body.dailyCalories) || 2000;
        return missingMeals.map(slot => fallbackMeal(slot, Math.round(totalCals / missingMeals.length)));
    }

    return missingMeals.map(slot => {
        const found = (result.meals as Array<Record<string, unknown>>)?.find(m => m.meal === slot);
        return found || fallbackMeal(slot, Math.round((Number(body.dailyCalories) || 2000) / missingMeals.length));
    });
}