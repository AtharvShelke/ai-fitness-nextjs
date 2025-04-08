// app/api/generate/workout/route.ts
import { genAI } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      height, weight, gender, age, goal,
      healthConditions, workoutDaysPerWeek, dietType,
    } = body;

    const prompt = `
You are a professional fitness and nutrition expert.

Create a personalized workout and diet plan:
- Height: ${height} cm
- Weight: ${weight} kg
- Gender: ${gender}
- Age: ${age}
- Goal: ${goal}
- Health Conditions: ${healthConditions || 'None'}
- Workout Days per Week: ${workoutDaysPerWeek}
- Diet Type: ${dietType}

Return in a clear format with Workout and Diet sections.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([prompt]);
    const text = await result.response.text();

    return NextResponse.json({ success: true, workoutPlan: text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
