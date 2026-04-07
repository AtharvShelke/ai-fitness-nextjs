// app/api/generate/gemini/diet/route.ts
// Uses modular per-meal generation with validation, retry, and progress streaming

import { NextResponse } from "next/server";
import { hashInput, getCached, setCache } from "@/lib/cache";
import { generateFullDiet } from "@/lib/generator";
import { getExpectedMeals } from "@/lib/validation";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (email) {
            const userRecord = await prisma.usedEmail.findUnique({ where: { email } });
            if (userRecord?.hasUsedDiet) {
                return NextResponse.json({ success: false, error: "You have already generated a diet plan." }, { status: 403 });
            }
        }

        const cacheBase = hashInput(body, "diet");

        // Full plan cache check
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
                                unit: latestMeal?.meal || "?",
                            });
                            controller.enqueue(encoder.encode(progress + "\n"));
                        }
                    );

                    if (!integrity.passed) {
                        console.warn(`[diet/route] Integrity issues: ${integrity.issues.join("; ")}`);
                    }

                    const final = JSON.stringify({
                        type: "complete",
                        plan,
                        validation: {
                            valid: validation.valid,
                            missingMeals: validation.missingMeals,
                            incompleteMeals: validation.incompleteMeals,
                            mealCount: validation.mealCount,
                        },
                        integrity: {
                            passed: integrity.passed,
                            issues: integrity.issues,
                        },
                    });
                    controller.enqueue(encoder.encode(final + "\n"));

                    setCache(`full:diet:${cacheBase}`, final);

                    if (email) {
                        try {
                            await prisma.usedEmail.update({
                                where: { email },
                                data: { hasUsedDiet: true }
                            });
                        } catch (err: any) {
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