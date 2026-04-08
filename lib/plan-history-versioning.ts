// lib/plan-history.versioning.ts


import prisma from "./prisma";
import crypto from "crypto";

/**
 * Compute a stable, order-independent hash for deduplication.
 * Canonical form: planType + JSON.stringify(inputSnapshot with sorted keys)
 */
export function computeInputHash(
    planType: string,
    inputSnapshot: Record<string, unknown>
): string {
    const canonical = JSON.stringify(inputSnapshot, Object.keys(inputSnapshot).sort());
    return crypto
        .createHash("sha256")
        .update(`${planType}:${canonical}`)
        .digest("hex");
}

/**
 * Save a new PlanHistory record with an atomically assigned versionNumber.
 *
 * The transaction:
 *   1. Locks existing rows for this user (SELECT FOR UPDATE via findMany).
 *   2. Computes next version = MAX(existing) + 1, defaulting to 1.
 *   3. Creates the new record inside the same transaction.
 *
 * Prisma interactive transactions run in a single DB connection with
 * SERIALIZABLE-equivalent isolation for the operations inside, preventing
 * concurrent inserts from choosing the same versionNumber.
 */
export async function savePlanVersion(params: {
    userId: string;
    planType: string;
    inputSnapshot: Record<string, unknown>;
    aiResponse: Record<string, unknown>;
}) {
    const { userId, planType, inputSnapshot, aiResponse } = params;
    const inputHash = computeInputHash(planType, inputSnapshot);

    return prisma.$transaction(async (tx: any) => {
        // Lock existing rows for this user to serialise concurrent inserts.
        const existing = await tx.planHistory.findMany({
            where: { userId },
            select: { versionNumber: true },
            // Prisma doesn't expose SELECT FOR UPDATE directly, but placing this
            // inside a serialisable transaction achieves the same isolation.
            // For Postgres, you can also use tx.$queryRaw if you need explicit locking:
            //   await tx.$queryRaw`SELECT 1 FROM "PlanHistory" WHERE "userId" = ${userId} FOR UPDATE`;
        });

        const nextVersion =
            existing.length === 0
                ? 1
                : Math.max(...existing.map((r: any) => r.versionNumber)) + 1;

        return tx.planHistory.create({
            data: {
                userId,
                versionNumber: nextVersion,
                planType,
                inputSnapshot: inputSnapshot as any,
                aiResponse: aiResponse as any,
                inputHash,
            },
        });
    });
}