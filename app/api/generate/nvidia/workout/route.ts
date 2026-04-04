// app/api/generate/nvidia/workout/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Zod Schema ────────────────────────────────────────────────────────────────
// (keep all your existing schemas exactly as-is)
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

// ── Prompt (unchanged) ────────────────────────────────────────────────────────
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

// ── NVIDIA API call ───────────────────────────────────────────────────────────
async function callGemmaStream(prompt: string): Promise<ReadableStream> {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemma-4-31b-it",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 16384,
            temperature: 0.7,
            top_p: 0.95,
            stream: true,
            chat_template_kwargs: { enable_thinking: false },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`NVIDIA API error ${response.status}: ${err}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder("utf-8");

    return new ReadableStream({
        async start(controller) {
            let buffer = "";
            const encoder = new TextEncoder();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("data: ")) {
                            const dataStr = trimmed.slice(6);
                            if (dataStr === "[DONE]") {
                                controller.close();
                                return;
                            }
                            try {
                                const parsed = JSON.parse(dataStr);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    controller.enqueue(encoder.encode(content));
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    }
                }
                controller.close();
            } catch (err) {
                controller.error(err);
            }
        }
    });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const body = await req.json();

        const stream = await callGemmaStream(buildPrompt(body));

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache"
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        console.error("[workout/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}