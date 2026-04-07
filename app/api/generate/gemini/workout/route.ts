// app/api/generate/gemini/workout/route.ts — UPDATED: saves new input fields

import { NextResponse } from "next/server";
import { hashInput, getCached, setCache } from "@/lib/cache";
import { getSafeWorkout } from "@/lib/helpers";
import { generateFullWorkout } from "@/lib/generator";
import prisma from "@/lib/prisma";
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
            if (userRecord?.hasUsedWorkout) {
                return NextResponse.json({ success: false, error: "You have already generated a workout plan." }, { status: 403 });
            }
        }

        const cacheBase = hashInput(body, "workout");

        const cachedFull = getCached(`full:workout:${cacheBase}`);
        if (cachedFull) {
            console.log(`[workout/route] Full cache HIT: ${cacheBase}`);
            return new Response(cachedFull, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "X-Model-Used": "cache",
                    "X-Gen-Status": "complete",
                },
            });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const { plan, validation, integrity, logs } = await generateFullWorkout(
                        body,
                        cacheBase,
                        (done, total, latestDay) => {
                            const progress = JSON.stringify({
                                type: "progress",
                                done,
                                total,
                                unit: (latestDay as Record<string, unknown>)?.day || "?",
                            });
                            controller.enqueue(encoder.encode(progress + "\n"));
                        }
                    );

                    if (!(integrity as { passed: boolean }).passed) {
                        console.warn(`[workout/route] Integrity issues: ${(integrity as { issues: string[] }).issues.join("; ")}`);
                    }

                    const final = JSON.stringify({
                        type: "complete",
                        plan,
                        validation: {
                            valid: (validation as { valid: boolean }).valid,
                            missingDays: (validation as { missingDays: string[] }).missingDays,
                            incompleteDays: (validation as { incompleteDays: string[] }).incompleteDays,
                            dayCount: (validation as { dayCount: number }).dayCount,
                        },
                        integrity: {
                            passed: (integrity as { passed: boolean }).passed,
                            issues: (integrity as { issues: string[] }).issues,
                        },
                    });
                    controller.enqueue(encoder.encode(final + "\n"));

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
                                        goal: body.goal,
                                    }
                                }),
                                prisma.generatedPlan.create({
                                    data: {
                                        user: { connect: { email } },
                                        type: "workout",
                                        data: getSafeWorkout(plan as Record<string, unknown>, {
                                            bmi: body.bmi || 0,
                                            bmiCategory: body.bmiCategory || "Normal",
                                            bmr: body.bmr || 0,
                                            tdee: body.tdee || 0,
                                            recommendedCalories: body.recommendedCalories || 0,
                                        }, body.goal || ""),
                                        // Store full input snapshot for future retrieval and re-generation
                                        inputData: body as any,
                                    }
                                })
                            ]);
                        } catch (err) {
                            console.error("[workout/route] Failed to update used status", err);
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
                "X-Gen-Mode": "parallel-per-day",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Something went wrong";
        console.error("[workout/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}