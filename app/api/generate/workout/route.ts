// app/api/generate/workout/route.ts
import { genAI } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),            // e.g. "8-10" or "30s"
  rest: z.string(),            // e.g. "90s"
  muscle: z.string(),          // primary muscle targeted
  tips: z.string(),
});

const DayScheduleSchema = z.object({
  day: z.string(),             // "Monday"
  type: z.enum(["training", "rest", "active_recovery"]),
  focus: z.string(),           // "Chest & Triceps" | "Rest" | …
  durationMinutes: z.number(),
  exercises: z.array(ExerciseSchema),
});

const WorkoutPlanSchema = z.object({
  summary: z.object({
    bmi: z.number(),
    bmiCategory: z.string(),
    bmr: z.number(),           // kcal/day at rest
    tdee: z.number(),          // total daily energy expenditure
    fitnessLevel: z.string(),  // "Beginner" | "Intermediate" | "Advanced"
    recommendedCalories: z.number(),
  }),
  weeklySchedule: z.array(DayScheduleSchema),
  warmup: z.array(z.string()),
  cooldown: z.array(z.string()),
  progressionPlan: z.object({
    week1_2: z.string(),
    week3_4: z.string(),
    week5_6: z.string(),
  }),
  warnings: z.array(z.string()),   // health-condition callouts
  tips: z.array(z.string()),       // general pro tips
});

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(body: Record<string, string>) {
  const {
    height, weight, gender, age, goal,
    healthConditions, workoutDaysPerWeek, dietType,
  } = body;

  return `
You are an elite personal trainer and sports scientist.

USER PROFILE
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${gender}
- Age: ${age}
- Goal: ${goal}
- Health Conditions: ${healthConditions || "None"}
- Workout Days per Week: ${workoutDaysPerWeek}
- Diet Type: ${dietType || "Not specified"}

TASK
Generate a complete, personalised weekly workout plan.

RULES
1. Respond with VALID JSON only — no markdown fences, no prose, no extra keys.
2. Match this exact schema (all fields required):

{
  "summary": {
    "bmi": <number, 1 decimal>,
    "bmiCategory": "<Underweight|Normal|Overweight|Obese>",
    "bmr": <number, rounded to nearest 10>,
    "tdee": <number, rounded to nearest 10>,
    "fitnessLevel": "<Beginner|Intermediate|Advanced>",
    "recommendedCalories": <number, rounded to nearest 50>
  },
  "weeklySchedule": [
    /* exactly 7 entries, one per day Mon–Sun */
    {
      "day": "<Monday|Tuesday|…|Sunday>",
      "type": "<training|rest|active_recovery>",
      "focus": "<muscle group or 'Rest Day'>",
      "durationMinutes": <number>,
      "exercises": [
        /* 0 items for rest days, 4–7 for training days */
        {
          "name": "<exercise name>",
          "sets": <number>,
          "reps": "<e.g. 8-10 or 30s>",
          "rest": "<e.g. 60s>",
          "muscle": "<primary muscle>",
          "tips": "<one-sentence coaching cue>"
        }
      ]
    }
  ],
  "warmup": ["<5–6 short warmup steps>"],
  "cooldown": ["<4–5 short cooldown steps>"],
  "progressionPlan": {
    "week1_2": "<adaptation phase description>",
    "week3_4": "<progression phase description>",
    "week5_6": "<peak phase description>"
  },
  "warnings": ["<health-condition specific caution, or empty array>"],
  "tips": ["<3–5 general success tips tailored to the user>"]
}
`.trim();
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([buildPrompt(body)]);
    const raw = await result.response.text();

    // Strip accidental markdown fences the model may still emit
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate shape — throws ZodError if the model drifted from schema
    const plan = WorkoutPlanSchema.parse(parsed);

    return NextResponse.json({ success: true, plan });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("[workout/route]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}