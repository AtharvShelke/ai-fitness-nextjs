// app/api/generate/gemini/diet/route.ts
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const MealOptionSchema = z.object({
    name: z.string(),
    calories: z.number(),
    protein: z.string(),
    carbs: z.string(),
    fats: z.string(),
    prepMinutes: z.number(),
    ingredients: z.array(z.string()),
    notes: z.string(),
});

const MealSchema = z.object({
    meal: z.string(),
    time: z.string(),
    options: z.array(MealOptionSchema),
});

const DietPlanSchema = z.object({
    summary: z.object({
        dailyCalories: z.number(),
        protein: z.string(),
        carbs: z.string(),
        fats: z.string(),
        hydration: z.string(),
        dietLabel: z.string(),
    }),
    mealPlan: z.array(MealSchema),
    supplements: z.array(z.object({
        name: z.string(),
        dose: z.string(),
        timing: z.string(),
    })),
    avoidFoods: z.array(z.string()),
    weeklyVariation: z.object({
        refeedDay: z.string(),
        lowCarbDay: z.string(),
    }),
    warnings: z.array(z.string()),
    tips: z.array(z.string()),
});

export type DietPlan = z.infer<typeof DietPlanSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(body: Record<string, any>) {
    const {
        height, weight, gender, age, goal,
        healthConditions, dietType, allergies,
        mealFrequency, caloricPreference, foodRestrictions,
        bmi, bmiCategory, bmr, tdee, dailyCalories
    } = body;

    return `
You are a registered dietitian and certified nutritionist.

USER PROFILE & PRE-CALCULATED METRICS
- Height: ${height} cm | Weight: ${weight} kg | Gender: ${gender} | Age: ${age}
- Goal: ${goal}
- BMI: ${bmi} (${bmiCategory}) | BMR: ${bmr} kcal | TDEE: ${tdee} kcal
- Target Daily Calories: ${dailyCalories} kcal
- Health Conditions: ${healthConditions || "None"}
- Diet Type: ${dietType || "Balanced"}
- Allergies: ${allergies || "None"}
- Food Restrictions: ${foodRestrictions || "None"}
- Meal Frequency: ${mealFrequency || "3 meals + 1 snack"}

TASK
Generate a complete, personalised daily diet plan mapped perfectly to the pre-calculated Target Daily Calories (${dailyCalories} kcal).

RULES
1. Respond with VALID JSON only — no markdown fences, no prose, no extra keys.
2. Strictly respect all allergies and food restrictions.
3. Match this exact schema (do not output the omitted deterministic values like dailyCalories):

{
  "summary": {
    "protein": "<Xg>",
    "carbs": "<Xg>",
    "fats": "<Xg>",
    "hydration": "<X.XL>",
    "dietLabel": "<short label e.g. 'High-Protein Vegetarian'>"
  },
  "mealPlan": [
    {
      "meal": "<Breakfast|Morning Snack|Lunch|Afternoon Snack|Dinner>",
      "time": "<suggested time, e.g. '7:30 AM'>",
      "options": [
        {
          "name": "<dish name>",
          "calories": <number>,
          "protein": "<Xg>",
          "carbs": "<Xg>",
          "fats": "<Xg>",
          "prepMinutes": <number>,
          "ingredients": ["<ingredient + quantity>"],
          "notes": "<swap suggestion or serving tip>"
        }
      ]
    }
  ],
  "supplements": [
    { "name": "<supplement>", "dose": "<dose>", "timing": "<when to take>" }
  ],
  "avoidFoods": ["<food to avoid with 1-line reason>"],
  "weeklyVariation": {
    "refeedDay": "<day + calorie/macro adjustment description>",
    "lowCarbDay": "<day + calorie/macro adjustment description>"
  },
  "warnings": ["<health-condition specific dietary caution, or empty array>"],
  "tips": ["<3–5 actionable nutrition tips tailored to the user>"]
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

        console.log(`[diet/route] Generation active via: ${usedModel}`);

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
        console.error("[diet/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}