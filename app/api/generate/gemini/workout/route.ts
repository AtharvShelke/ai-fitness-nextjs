// app/api/generate/gemini/workout/route.ts
// Uses modular per-day generation with validation, retry, and progress streaming

import { NextResponse } from "next/server";
import { hashInput, getCached, setCache } from "@/lib/cache";
import { generateFullWorkout } from "@/lib/generator";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const cacheBase = hashInput(body, "workout");

        // Full plan cache check
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

        // Stream progress as SSE-like newline-delimited JSON
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const { plan, validation, integrity, logs } = await generateFullWorkout(
                        body,
                        cacheBase,
                        (done, total, latestDay) => {
                            // Send progress event
                            const progress = JSON.stringify({
                                type: "progress",
                                done,
                                total,
                                unit: latestDay?.day || "?",
                            });
                            controller.enqueue(encoder.encode(progress + "\n"));
                        }
                    );

                    // Log integrity issues
                    if (!integrity.passed) {
                        console.warn(`[workout/route] Integrity issues: ${integrity.issues.join("; ")}`);
                    }

                    // Send final complete plan
                    const final = JSON.stringify({
                        type: "complete",
                        plan,
                        validation: {
                            valid: validation.valid,
                            missingDays: validation.missingDays,
                            incompleteDays: validation.incompleteDays,
                            dayCount: validation.dayCount,
                        },
                        integrity: {
                            passed: integrity.passed,
                            issues: integrity.issues,
                        },
                    });
                    controller.enqueue(encoder.encode(final + "\n"));

                    // Cache the full plan for repeat requests
                    setCache(`full:workout:${cacheBase}`, final);

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