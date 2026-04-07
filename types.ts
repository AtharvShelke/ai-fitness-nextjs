// ─── Types ─────────────────────────────────────────────────────────────────────
// Lean types matching the flattened LLM output + client-side static data merge

interface WorkoutSummary {
    bmi: number; bmiCategory: string; bmr: number;
    tdee: number; fitnessLevel: string; recommendedCalories: number;
}
interface Exercise {
    name: string; sets: number; reps: string;
    rest: string; muscle: string;
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
interface MealItem {
    meal: string; time: string; name: string;
    calories: number; protein: string; carbs: string;
    fats: string; prepMins: number; ingredients: string[];
}
interface DietPlan {
    summary: DietSummary;
    meals: MealItem[];
    supplements: { name: string; dose: string; timing: string }[];
    avoidFoods: string[];
    weeklyVariation: { refeedDay: string; lowCarbDay: string };
    warnings: string[]; tips: string[];
}
interface GenProgress {
    done: number;
    total: number;
    units: string[];   // completed unit names
    status: 'generating' | 'validating' | 'recovering' | 'complete' | 'error';
}

interface UserInputData {
    // Step 1 — Biometrics (existing)
    height: string;
    weight: string;
    age: string;
    gender: string;

    // Step 2 — Objectives (existing + new)
    goal: string;
    targetWeight?: string;        // NEW: e.g. "65kg"
    timeline?: string;            // NEW: e.g. "12 weeks"
    fitnessLevel?: string;        // NEW: Beginner | Intermediate | Advanced
    healthConditions?: string;    // existing

    // Step 3 — Training config (existing + new)
    workoutDaysPerWeek?: string;  // workout only
    sessionDuration?: string;     // NEW: e.g. "45-60 min"
    trainingLocation?: string;    // NEW: Gym | Home | Outdoors | Mixed
    activityLevel?: string;       // NEW: Sedentary | Lightly Active | Moderately Active | Very Active

    // Step 4 — Nutrition config (existing + new)
    dietType?: string;
    allergies?: string;
    foodRestrictions?: string;
    mealFrequency?: string;
    caloricPreference?: string;

    // Step 4 — Lifestyle (NEW)
    sleepDuration?: string;       // NEW: e.g. "7-8 hours"
    stressLevel?: string;         // NEW: Low | Moderate | High
}

// ─── Computed metrics added server-side before generation ────────────────────

interface ComputedMetrics {
    bmi?: number;
    bmiCategory?: string;
    bmr?: number;
    tdee?: number;
    recommendedCalories?: number;
    dailyCalories?: number;
}

// ─── Full generation request body = inputs + computed metrics ────────────────

type GenerationBody = UserInputData & ComputedMetrics;
