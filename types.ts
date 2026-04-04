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
