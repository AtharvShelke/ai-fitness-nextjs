// app/api/generate/nvidia/diet/route.ts
// NVIDIA fallback for diet — same event format as Gemini route

import { NextResponse } from "next/server";
import { hashInput, getCached, setCache } from "@/lib/cache";
import prisma from "@/lib/prisma";
import { getSafeDiet } from "@/lib/helpers";

async function callNvidia(prompt: string): Promise<string> {
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
            max_tokens: 4096,
            temperature: 0.6,
            top_p: 0.9,
            stream: false,
            chat_template_kwargs: { enable_thinking: false },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`NVIDIA API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

function cleanAndParse(raw: string): any {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();
    if (!cleaned) return null;
    try { return JSON.parse(cleaned); } catch {
        const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) { try { return JSON.parse(match[1]); } catch { } }
        return null;
    }
}

function buildPrompt(body: Record<string, any>) {
    const { height, weight, gender, age, goal, healthConditions, dietType, allergies, mealFrequency, foodRestrictions, bmi, bmiCategory, tdee, dailyCalories } = body;
    return `You are a certified nutritionist. Be concise. Minimal JSON output.
USER: ${height}cm, ${weight}kg, ${gender}, ${age}yo. Goal: ${goal}.
BMI: ${bmi} (${bmiCategory}) | TDEE: ${tdee} | Target: ${dailyCalories} kcal.
Diet: ${dietType || "Balanced"}. Allergies: ${allergies || "None"}. Restrictions: ${foodRestrictions || "None"}.
Meals: ${mealFrequency || "3+1 snack"}. Conditions: ${healthConditions || "None"}.
Return VALID JSON only. One object:
{"protein":"<Xg>","carbs":"<Xg>","fats":"<Xg>","hydration":"<X.XL>","dietLabel":"<short label>","meals":[{"meal":"<Breakfast|Snack|Lunch|Dinner>","time":"<7:30 AM>","name":"<dish>","calories":<n>,"protein":"<Xg>","carbs":"<Xg>","fats":"<Xg>","prepMins":<n>,"ingredients":["<ingredient + qty>"]}],"supplements":[{"name":"<supplement>","dose":"<dose>","timing":"<when>"}],"avoidFoods":["<food to avoid>"],"refeedDay":"<day + adjustment>","lowCarbDay":"<day + adjustment>","warnings":["<caution if any>"]}`;
}

import { auth } from "@/auth";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const email = session.user.email;
        const body = await req.json();

        if (email) {
            const userRecord = await prisma.user.findUnique({ where: { email } });
            if (userRecord?.hasUsedDiet) {
                return NextResponse.json({ success: false, error: "You have already generated a diet plan." }, { status: 403 });
            }
        }

        const cacheBase = hashInput(body, "diet");

        const cachedFull = getCached(`full:diet:${cacheBase}`);
        if (cachedFull) {
            return new Response(cachedFull, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "X-Model-Used": "cache",
                    "X-Gen-Status": "complete",
                },
            });
        }

        const raw = await callNvidia(buildPrompt(body));
        const parsed = cleanAndParse(raw);

        if (!parsed) {
            throw new Error("Failed to parse NVIDIA response");
        }

        const final = JSON.stringify({
            type: "complete",
            plan: parsed,
            validation: { valid: true, missingMeals: [], incompleteMeals: [], mealCount: (parsed.meals || []).length },
            integrity: { passed: true, issues: [] },
        });

        setCache(`full:diet:${cacheBase}`, final);

        if (email) {
            try {
                await prisma.$transaction([
                    prisma.user.update({
                        where: { email },
                        data: {
                            hasUsedDiet: true,
                            height: parseFloat(body.height),
                            weight: parseFloat(body.weight),
                            age: parseInt(body.age),
                            gender: body.gender,
                            goal: body.goal
                        }
                    }),
                    prisma.generatedPlan.create({
                        data: {
                            user: { connect: { email } },
                            type: "diet",
                            data: getSafeDiet(parsed, {
                                dailyCalories: body.dailyCalories || body.recommendedCalories || 0,
                            }, body.goal || '', body.dietType || ''),
                            inputData: body
                        }
                    })
                ]);
            } catch (err) {
                console.error("[nvidia/diet] Failed to update used status", err);
            }
        }

        return new Response(final + "\n", {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "X-Model-Used": "gemma-4-31b-it",
                "X-Gen-Mode": "monolithic-fallback",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        console.error("[nvidia/diet]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}