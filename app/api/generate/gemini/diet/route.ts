// app/api/generate/gemini/diet/route.ts — UPDATED: saves new input fields

import { NextResponse } from "next/server";
import { hashInput, getPersistentCache, setPersistentCache, acquireLock, releaseLock, waitForCache } from "@/lib/cache";
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
            if (!userRecord) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

            // Lazy Reset Logic
            if (!userRecord.billingCycleEndsAt || Date.now() > userRecord.billingCycleEndsAt.getTime()) {
                const newLimit = userRecord.tier === "BASIC" ? 50 : userRecord.tier === "ELITE" ? 1000 : 3;
                await prisma.user.update({
                    where: { email },
                    data: {
                        tokenBalance: newLimit,
                        billingCycleEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
                    }
                });
            }

            // Atomic token decrement lock
            const updateCount = await prisma.user.updateMany({
                where: { email, tokenBalance: { gte: 1 } },
                data: { tokenBalance: { decrement: 1 } }
            });

            if (updateCount.count === 0) {
                return NextResponse.json({ success: false, error: "Insufficient tokens. Please upgrade your plan." }, { status: 402 });
            }
        }

        const cacheBase = hashInput(body, "diet");
        const cacheKey = `full:diet:${cacheBase}`;

        const dbCache = await getPersistentCache(cacheKey);
        if (dbCache) {
            console.log(`[diet/route] Global cache HIT: ${cacheKey}`);
            return new Response(dbCache, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "X-Model-Used": "cache",
                    "X-Gen-Status": "complete",
                },
            });
        }

        // --- DEDUPLICATION START ---
        // If we don't get the lock, wait for the other parallel request to finish and populate the cache
        const hasLock = await acquireLock(cacheKey);
        if (!hasLock) {
            console.log(`[diet/route] Request deduplicated! Waiting for cache: ${cacheKey}`);
            const waitedCache = await waitForCache(cacheKey);
            if (waitedCache) {
                return new Response(waitedCache, {
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8",
                        "X-Model-Used": "cache",
                    },
                });
            }
            // If wait failed/timed out, proceed anyway
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

                    await setPersistentCache(cacheKey, "diet", final);

                    if (email) {
                        try {
                            await prisma.$transaction([
                                prisma.user.update({
                                    where: { email },
                                    data: {
                                        height: parseFloat(body.height),
                                        weight: parseFloat(body.weight),
                                        age: parseInt(body.age),
                                        gender: body.gender,
                                        goal: body.goal,
                                    }
                                }),
                                prisma.tokenTransaction.create({
                                    data: {
                                        user: { connect: { email } },
                                        amount: -1,
                                        type: "GENERATION",
                                        description: "Generated diet plan",
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
                    if (email) {
                        try {
                            await prisma.user.update({
                                where: { email },
                                data: { tokenBalance: { increment: 1 } }
                            });
                        } catch (refundErr) {
                            console.error("[diet/route] Failed to refund token", refundErr);
                        }
                    }
                    const errMsg = JSON.stringify({
                        type: "error",
                        message: e instanceof Error ? e.message : "Generation failed",
                    });
                    controller.enqueue(encoder.encode(errMsg + "\n"));
                    controller.close();
                } finally {
                    await releaseLock(cacheKey);
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