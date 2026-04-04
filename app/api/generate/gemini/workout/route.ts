// app/api/generate/gemini/workout/route.ts
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const ExerciseSchema = z.object({
    name: z.string(),
    sets: z.number(),
    reps: z.string(),
    rest: z.string(),
    muscle: z.string(),
    tips: z.string(),
});

const DayScheduleSchema = z.object({
    day: z.string(),
    type: z.enum(["training", "rest", "active_recovery"]),
    focus: z.string(),
    durationMinutes: z.number(),
    exercises: z.array(ExerciseSchema),
});

const WorkoutPlanSchema = z.object({
    summary: z.object({
        bmi: z.number(),
        bmiCategory: z.string(),
        bmr: z.number(),
        tdee: z.number(),
        fitnessLevel: z.string(),
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
    warnings: z.array(z.string()),
    tips: z.array(z.string()),
});

export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(body: Record<string, any>) {
    const {
        height, weight, gender, age, goal,
        healthConditions, workoutDaysPerWeek, dietType,
        bmi, bmiCategory, bmr, tdee, recommendedCalories
    } = body;

    return `
You are an elite personal trainer and sports scientist.

USER PROFILE & PRE-CALCULATED METRICS
- Height: ${height} cm | Weight: ${weight} kg | Gender: ${gender} | Age: ${age}
- Goal: ${goal}
- Workout Days per Week: ${workoutDaysPerWeek}
- BMI: ${bmi} (${bmiCategory}) | BMR: ${bmr} kcal | TDEE: ${tdee} kcal
- Recommended Daily Calories: ${recommendedCalories} kcal
- Health Conditions: ${healthConditions || "None"}
- Diet Type: ${dietType || "Not specified"}

TASK
Generate a complete, personalised weekly workout plan mapped perfectly to the user's pre-calculated metrics.

RULES
1. Respond with VALID JSON only — no markdown fences, no prose, no extra keys.
2. Match this exact schema (do not output omitted deterministic values like bmi, bmr, etc):

{
  "summary": {
    "fitnessLevel": "<Beginner|Intermediate|Advanced>"
  },
  "weeklySchedule": [
    {
      "day": "<Monday|Tuesday|…|Sunday>",
      "type": "<training|rest|active_recovery>",
      "focus": "<muscle group or 'Rest Day'>",
      "durationMinutes": <number>,
      "exercises": [
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

// ── Client ────────────────────────────────────────────────────────────────────

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json();

        let response;
        let usedModel = "gemini-2.5-flash";
        try {
            response = await ai.models.generateContentStream({
                model: "gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [{ text: buildPrompt(body) }],
                    },
                ],
            });
        } catch (initialErr) {
            console.warn("gemini-2.5-flash failed, falling back to gemini-3-flash-preview", initialErr);
            usedModel = "gemini-3-flash-preview";
            response = await ai.models.generateContentStream({
                model: "gemini-3-flash-preview",
                config: {
                    thinkingConfig: {
                        thinkingLevel: ThinkingLevel.LOW,
                    },
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: buildPrompt(body) }],
                    },
                ],
            });
        }

        console.log(`[workout/route] Generation active via: ${usedModel}`);

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of response) {
                        if (chunk.text) {
                            controller.enqueue(encoder.encode(chunk.text));
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "X-Model-Used": usedModel
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        console.error("[workout/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}