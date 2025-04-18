// app/api/finance/route.ts
import { genAI } from "@/lib/gemini";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, description } = body;

    const prompt = `
You are a finance advisor.

Categorize the following expense into one of these categories: 
- travelling
- eating
- shopping
- housing
- other

Input:
amount = ${amount}
description = "${description}"

Output ONLY valid JSON in the following format:
{
  "amount": number,
  "description": string,
  "category": "travelling" | "eating" | "shopping" | "housing" | "other"
}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([prompt]);
    const text = await result.response.text();

    // Remove code block markdown and parse the JSON
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const { amount: parsedAmount, description: parsedDescription, category } = parsed;

    return NextResponse.json({
      success: true,
      amount: parsedAmount,
      description: parsedDescription,
      category,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
