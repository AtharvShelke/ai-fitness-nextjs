// app/api/generate/recover/route.ts
// Secondary endpoint to generate ONLY missing days/meals
// Called by frontend when post-stream validation detects gaps

import { NextResponse } from "next/server";
import { hashInput } from "@/lib/cache";
import { recoverWorkoutDays, recoverDietMeals } from "@/lib/generator";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, missing, requestData } = body;

        if (!type || !missing || !Array.isArray(missing) || missing.length === 0) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: type, missing[]" },
                { status: 400 }
            );
        }

        const cacheBase = hashInput(requestData, type);
        let recovered: any[];

        if (type === "workout") {
            console.log(`[recover] Generating ${missing.length} missing workout days: ${missing.join(", ")}`);
            recovered = await recoverWorkoutDays(requestData, missing, cacheBase);
        } else if (type === "diet") {
            console.log(`[recover] Generating ${missing.length} missing meals: ${missing.join(", ")}`);
            recovered = await recoverDietMeals(requestData, missing, cacheBase);
        } else {
            return NextResponse.json(
                { success: false, error: "type must be 'workout' or 'diet'" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            recovered,
            count: recovered.length,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Recovery failed";
        console.error("[recover/route]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
