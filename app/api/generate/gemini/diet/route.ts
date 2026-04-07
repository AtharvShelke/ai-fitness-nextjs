// app/api/generate/gemini/diet/route.ts — UPDATED: saves new input fields

import { NextResponse } from "next/server";
import { hashInput, getCached, setCache } from "@/lib/cache";
import { generateFullDiet } from "@/lib/generator";
import { getExpectedMeals } from "@/lib/validation";
import prisma from "@/lib/prisma";
import { getSafeDiet } from "@/lib/helpers";
import { auth } from "@/auth";


export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const email = session.user.email;
        const body = (await req.json()) as GenerationBody;

        if (email) {
            const userRecord = await prisma.user.findUnique({ where: { email } });
            if (userRecord?.hasUsedDiet) {
                return NextResponse.json({ success: false, error: "You have already generated a diet plan." }, { status: 403 });
            }
        }

        const cacheBase = hashInput(body, "diet");

        const cachedFull = getCached(`full:diet:${cacheBase}`);
        if (cachedFull) {
            console.log(`[diet/route] Full cache HIT: ${cacheBase}`);
            return new Response(cachedFull, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "X-Model-Used": "cache",
                    "X-Gen-Status": "complete",
                },
            });
        }

        const mealSlots = getExpectedMeals(body.mealFrequency);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const { plan, validation, integrity, logs } = await generateFullDiet(
                        body,
                        cacheBase,
                        mealSlots,
                        (done, total, latestMeal) => {
                            const progress = JSON.stringify({
                                type: "progress",
                                done,
                                total,
                                unit: (latestMeal as Record<string, unknown>)?.meal || "?",
                            });
                            controller.enqueue(encoder.encode(progress + "\n"));
                        }
                    );

                    if (!(integrity as { passed: boolean }).passed) {
                        console.warn(`[diet/route] Integrity issues: ${(integrity as { issues: string[] }).issues.join("; ")}`);
                    }

                    const final = JSON.stringify({
                        type: "complete",
                        plan,
                        validation: {
                            valid: (validation as { valid: boolean }).valid,
                            missingMeals: (validation as { missingMeals: string[] }).missingMeals,
                            incompleteMeals: (validation as { incompleteMeals: string[] }).incompleteMeals,
                            mealCount: (validation as { mealCount: number }).mealCount,
                        },
                        integrity: {
                            passed: (integrity as { passed: boolean }).passed,
                            issues: (integrity as { issues: string[] }).issues,
                        },
                    });
                    controller.enqueue(encoder.encode(final + "\n"));

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
                                        goal: body.goal,
                                    }
                                }),
                                prisma.generatedPlan.create({
                                    data: {
                                        user: { connect: { email } },
                                        type: "diet",
                                        data: getSafeDiet(
                                            plan as Record<string, unknown>,
                                            {
                                                dailyCalories: body.dailyCalories || body.recommendedCalories || 0,
                                            },
                                            body.goal || "",
                                            body.dietType || ""
                                        ),
                                        // Store full input snapshot — includes all new fields
                                        inputData: body as any, 
                                    }
                                })
                            ]);
                        } catch (err: unknown) {
                            console.error("[diet/route] Failed to update used status", err);
                        }
                    }

                    controller.close();
                } catch (e) {
                    const errMsg = JSON.stringify({
                        type: "error",
                        message: e instanceof Error ? e.message : "Generation failed",
                    });
                    controller.enqueue(encoder.encode(errMsg + "\n"));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "X-Model-Used": "gemini-2.5-flash",
                "X-Gen-Mode": "parallel-per-meal",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        console.error("[diet/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}