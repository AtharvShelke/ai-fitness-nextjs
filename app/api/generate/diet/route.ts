// app/api/generate/diet/route.ts
import { genAI } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Zod Schema ────────────────────────────────────────────────────────────────

const MealOptionSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.string(),         // "28g"
  carbs: z.string(),           // "45g"
  fats: z.string(),            // "12g"
  prepMinutes: z.number(),
  ingredients: z.array(z.string()),
  notes: z.string(),           // serving tip or swap
});

const MealSchema = z.object({
  meal: z.string(),            // "Breakfast"
  time: z.string(),            // "7:00 AM"
  options: z.array(MealOptionSchema),  // 2 alternatives per meal
});

const DietPlanSchema = z.object({
  summary: z.object({
    dailyCalories: z.number(),
    protein: z.string(),       // "160g"
    carbs: z.string(),
    fats: z.string(),
    hydration: z.string(),     // "3.5L"
    dietLabel: z.string(),     // "High-protein Vegetarian"
  }),
  mealPlan: z.array(MealSchema),
  supplements: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    timing: z.string(),
  })),
  avoidFoods: z.array(z.string()),
  weeklyVariation: z.object({
    refeedDay: z.string(),     // e.g. "Saturday — add 300 kcal from carbs"
    lowCarbDay: z.string(),
  }),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
});

export type DietPlan = z.infer<typeof DietPlanSchema>;

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(body: Record<string, string>) {
  const {
    height, weight, gender, age, goal,
    healthConditions, dietType, allergies,
    mealFrequency, caloricPreference, foodRestrictions,
  } = body;

  return `
You are a registered dietitian and certified nutritionist.

USER PROFILE
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${gender}
- Age: ${age}
- Goal: ${goal}
- Health Conditions: ${healthConditions || "None"}
- Diet Type: ${dietType || "Balanced"}
- Allergies: ${allergies || "None"}
- Food Restrictions: ${foodRestrictions || "None"}
- Meal Frequency: ${mealFrequency || "3 meals + 1 snack"}
- Caloric Preference: ${caloricPreference || "Balanced"}

TASK
Generate a complete, personalised daily diet plan.

RULES
1. Respond with VALID JSON only — no markdown fences, no prose, no extra keys.
2. Strictly respect all allergies and food restrictions.
3. Match this exact schema (all fields required):

{
  "summary": {
    "dailyCalories": <number, rounded to nearest 50>,
    "protein": "<Xg>",
    "carbs": "<Xg>",
    "fats": "<Xg>",
    "hydration": "<X.XL>",
    "dietLabel": "<short label e.g. 'High-Protein Vegetarian'>"
  },
  "mealPlan": [
    /* one entry per meal based on mealFrequency */
    {
      "meal": "<Breakfast|Morning Snack|Lunch|Afternoon Snack|Dinner>",
      "time": "<suggested time, e.g. '7:30 AM'>",
      "options": [
        /* exactly 2 options per meal so the user has a choice */
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
    /* only clinically relevant ones; empty array if none needed */
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

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent([buildPrompt(body)]);
    const raw = await result.response.text();

    // Strip accidental markdown fences the model may still emit
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate shape — throws ZodError if the model drifted from schema
    const plan = DietPlanSchema.parse(parsed);

    return NextResponse.json({ success: true, plan });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("[diet/route]", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}