// app/api/plan-history/route.ts
// POST  — save a new versioned generation
// GET   — fetch all history for the authenticated user (newest first)

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

import { savePlanVersion } from "@/lib/plan-history-versioning";
import type { ApiResponse, PlanHistoryRecord } from "@/lib/plan-history-schemas";
import { SavePlanSchema } from "@/lib/plan-history-schemas";

// ─── POST /api/plan-history ───────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse<ApiResponse<PlanHistoryRecord>>> {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // ── Validate body ────────────────────────────────────────────────────────
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = SavePlanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues.map((e) => e.message).join("; ") },
                { status: 422 }
            );
        }

        const { planType, inputSnapshot, aiResponse } = parsed.data;

        // ── Atomically assign version and persist ────────────────────────────────
        const record = await savePlanVersion({
            userId: user.id,
            planType,
            inputSnapshot,
            aiResponse,
        });

        return NextResponse.json(
            { success: true, data: serialise(record) },
            { status: 201 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("[plan-history POST]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── GET /api/plan-history ────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse<ApiResponse<PlanHistoryRecord[]>>> {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const records = await prisma.planHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, data: records.map(serialise) });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("[plan-history GET]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

// ─── Serialiser — normalise Prisma record for the wire ───────────────────────
function serialise(r: {
    id: string;
    userId: string;
    versionNumber: number;
    planType: string;
    inputSnapshot: unknown;
    aiResponse: unknown;
    inputHash: string | null;
    createdAt: Date;
}): PlanHistoryRecord {
    return {
        id: r.id,
        userId: r.userId,
        versionNumber: r.versionNumber,
        planType: r.planType as "workout" | "diet",
        inputSnapshot: r.inputSnapshot as Record<string, unknown>,
        aiResponse: r.aiResponse as Record<string, unknown>,
        inputHash: r.inputHash,
        createdAt: r.createdAt.toISOString(),
    };
}