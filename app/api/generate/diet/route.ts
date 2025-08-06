// app/api/generate/diet/route.ts
import { genAI } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      height, weight, gender, age, goal,
      healthConditions, dietType, allergies,
      mealFrequency, caloricPreference, foodRestrictions,
    } = body;

    const prompt = `
You are a certified nutritionist.

Create a personalized diet plan:
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${gender}
- Age: ${age}
- Goal: ${goal}
- Health Conditions: ${healthConditions || 'None'}
- Diet Type: ${dietType}
- Allergies: ${allergies || 'None'}
- Food Restrictions: ${foodRestrictions || 'None'}
- Meal Frequency: ${mealFrequency || '3 meals/day'}
- Caloric Preference: ${caloricPreference || 'Balanced'}

Structure as breakfast, lunch, dinner, snacks, with portion sizes & calories.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([prompt]);
    const text = await result.response.text();

    return NextResponse.json({ success: true, dietPlan: text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
  
}
