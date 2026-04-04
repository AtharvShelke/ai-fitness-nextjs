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
