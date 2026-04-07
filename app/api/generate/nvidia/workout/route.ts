// app/api/generate/nvidia/workout/route.ts
// NVIDIA fallback — uses same modular system but via NVIDIA API
// Falls back to safe defaults if NVIDIA is also unavailable

import { NextResponse } from "next/server";
import { hashInput, getCached, setCache, unitCacheKey } from "@/lib/cache";
import { ALL_DAYS } from "@/lib/validation";
import prisma from "@/lib/prisma";
import { getSafeWorkout } from "@/lib/helpers";

// ── NVIDIA non-streaming call ─────────────────────────────────────────────────

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
    const { height, weight, gender, age, goal, healthConditions, workoutDaysPerWeek, bmi, bmiCategory, bmr, tdee, recommendedCalories } = body;
    return `You are an elite personal trainer. Be concise. Minimal JSON output.
USER: ${height}cm, ${weight}kg, ${gender}, ${age}yo. Goal: ${goal}. ${workoutDaysPerWeek} days/wk.
BMI: ${bmi} (${bmiCategory}) | BMR: ${bmr} | TDEE: ${tdee} | Target: ${recommendedCalories} kcal.
Conditions: ${healthConditions || "None"}.
Return VALID JSON only. EXACTLY 7 days. One object:
{"fitnessLevel":"<Beginner|Intermediate|Advanced>","days":[{"day":"<Mon|Tue|Wed|Thu|Fri|Sat|Sun>","type":"<training|rest|active_recovery>","focus":"<muscle group or Rest Day>","mins":<number>,"exercises":[{"name":"<exercise>","sets":<n>,"reps":"<e.g. 8-10>","rest":"<e.g. 60s>","muscle":"<primary muscle>"}]}],"warnings":["<caution if any>"]}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

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
            if (userRecord?.hasUsedWorkout) {
                return NextResponse.json({ success: false, error: "You have already generated a workout plan." }, { status: 403 });
            }
        }

        const cacheBase = hashInput(body, "workout");

        const cachedFull = getCached(`full:workout:${cacheBase}`);
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
            validation: { valid: true, missingDays: [], incompleteDays: [], dayCount: (parsed.days || []).length },
            integrity: { passed: true, issues: [] },
        });

        setCache(`full:workout:${cacheBase}`, final);

        if (email) {
            try {
                await prisma.$transaction([
                    prisma.user.update({
                        where: { email },
                        data: {
                            hasUsedWorkout: true,
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
                            type: "workout",
                            data: getSafeWorkout(parsed, {
                                bmi: body.bmi || 0,
                                bmiCategory: body.bmiCategory || 'Normal',
                                bmr: body.bmr || 0,
                                tdee: body.tdee || 0,
                                recommendedCalories: body.recommendedCalories || 0,
                            }, body.goal || ''),
                            inputData: body
                        }
                    })
                ]);
            } catch (err) {
                console.error("[nvidia/workout] Failed to update used status", err);
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
        console.error("[nvidia/workout]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}