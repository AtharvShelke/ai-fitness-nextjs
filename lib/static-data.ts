// lib/static-data.ts — Deterministic / repeatable content moved out of LLM generation
// These never change between requests, so generating them wastes tokens.

export const WARMUP_STEPS = [
    "5 min light cardio (jump rope, jogging in place, or cycling)",
    "Arm circles — 15 forward, 15 backward",
    "Leg swings — 10 per leg, front-to-back and side-to-side",
    "Bodyweight squats — 10 reps with controlled tempo",
    "Inchworms — 5 reps to activate posterior chain",
    "Cat-cow stretches — 8 reps for spinal mobility",
];

export const COOLDOWN_STEPS = [
    "2 min slow walk to lower heart rate",
    "Standing quad stretch — 30s per leg",
    "Seated hamstring stretch — 30s per leg",
    "Child's pose — 45s for back decompression",
    "Deep diaphragmatic breathing — 10 breaths",
];

export const PROGRESSION_PLAN = {
    week1_2: "Adaptation phase — Focus on form mastery, use moderate weights (RPE 6-7), full range of motion. Build consistency with the prescribed rep ranges.",
    week3_4: "Progression phase — Increase load by 5-10% where form permits, reduce rest by 10s on isolation moves. Push RPE to 7-8.",
    week5_6: "Peak load phase — Work at RPE 8-9, introduce intensity techniques (drop sets, pause reps) on final sets. Deload in week 7 if needed.",
};

/** Generate contextual tips based on user goal (deterministic, no LLM needed) */
export function getWorkoutTips(goal: string): string[] {
    const base = [
        "Track every session — progressive overload requires measurable progression.",
        "Sleep 7-9 hours for optimal recovery and muscle protein synthesis.",
        "Stay hydrated — aim for 0.5-1oz per pound of bodyweight daily.",
    ];
    if (goal?.includes("Fat") || goal?.includes("Cut") || goal?.includes("Tone")) {
        return [...base,
            "Keep rest periods short (30-60s) to maintain elevated heart rate.",
            "Add 2-3 HIIT sessions per week on non-training days for accelerated fat loss.",
        ];
    }
    if (goal?.includes("Muscle") || goal?.includes("Bulk") || goal?.includes("Strength")) {
        return [...base,
            "Consume protein within 2 hours post-workout for optimal muscle repair.",
            "Prioritize compound movements before isolation exercises each session.",
        ];
    }
    return [...base,
        "Vary training stimuli every 4-6 weeks to prevent plateaus.",
        "Include mobility work on rest days for long-term joint health.",
    ];
}

export function getDietTips(goal: string, dietType: string): string[] {
    const base = [
        "Meal prep 2-3 days ahead to maintain consistency.",
        "Eat protein with every meal to support satiety and muscle maintenance.",
    ];
    if (dietType?.includes("Veg") || dietType?.includes("Vegan")) {
        base.push("Combine legumes with grains (rice + beans) for complete amino acid profiles.");
    }
    if (goal?.includes("Fat") || goal?.includes("Cut")) {
        return [...base,
            "Front-load carbohydrates around training windows for energy.",
            "Use volume eating — fill plates with vegetables to stay full on fewer calories.",
        ];
    }
    if (goal?.includes("Muscle") || goal?.includes("Bulk")) {
        return [...base,
            "Eat a caloric surplus consistently — track weekly averages, not daily.",
            "Include calorie-dense foods like nuts, avocados, and olive oil to hit targets easily.",
        ];
    }
    return [...base,
        "Practice mindful eating — slow down and listen to hunger cues.",
        "Rotate protein sources weekly for micronutrient variety.",
    ];
}
