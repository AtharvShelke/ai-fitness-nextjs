// app/api/plan-history/[id]/route.ts
// GET — fetch a single versioned record by its CUID

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { ApiResponse, PlanHistoryRecord } from "@/lib/plan-history-schemas";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PlanHistoryRecord>>> {
    try {
        const { id } = await params;
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

        const record = await prisma.planHistory.findUnique({
            where: { id: id },
        });

        if (!record) {
            return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
        }

        // Ownership check — users can only read their own records
        if (record.userId !== user.id) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: record.id,
                userId: record.userId,
                versionNumber: record.versionNumber,
                planType: record.planType as "workout" | "diet",
                inputSnapshot: record.inputSnapshot as Record<string, unknown>,
                aiResponse: record.aiResponse as Record<string, unknown>,
                inputHash: record.inputHash,
                createdAt: record.createdAt.toISOString(),
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("[plan-history/:id GET]", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}