// lib/plan-history.schemas.ts
// Zod validation + shared TypeScript types for the plan-history system

import { z } from "zod";

// ─── Reusable JSON guard ──────────────────────────────────────────────────────
// Zod's z.record / z.unknown() accepts any valid JSON object; we add a runtime
// check that it is indeed a non-null object (not an array, not a primitive).
const jsonObject = z
    .record(z.string(), z.unknown())
    .refine((v) => v !== null && typeof v === "object" && !Array.isArray(v), {
        message: "Must be a non-array JSON object",
    });

// ─── POST /api/plan-history — request body ────────────────────────────────────
export const SavePlanSchema = z.object({
    planType: z.enum(["workout", "diet"], {
        message: "planType must be 'workout' or 'diet'",
    }),
    inputSnapshot: jsonObject,
    aiResponse: jsonObject,
});

export type SavePlanInput = z.infer<typeof SavePlanSchema>;

// ─── Shared API response shapes ───────────────────────────────────────────────
export interface PlanHistoryRecord {
    id: string;
    userId: string;
    versionNumber: number;
    planType: "workout" | "diet";
    inputSnapshot: Record<string, unknown>;
    aiResponse: Record<string, unknown>;
    inputHash: string | null;
    createdAt: string; // ISO string in API responses
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}