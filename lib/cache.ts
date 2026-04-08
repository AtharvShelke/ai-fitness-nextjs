// lib/cache.ts — Persistent Global Cache & Redis Deduplication

import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Redis } from '@upstash/redis';

// Only init redis if env exists
const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null;

/** Hash the relevant input fields into a deterministic key */
export function hashInput(body: Record<string, any>, type: "workout" | "diet"): string {
    const relevant = {
        type,
        height: body.height,
        weight: body.weight,
        gender: body.gender,
        age: body.age,
        goal: body.goal,
        healthConditions: body.healthConditions || "",
        dietType: body.dietType || "",
        ...(type === "workout"
            ? { workoutDaysPerWeek: body.workoutDaysPerWeek }
            : {
                allergies: body.allergies || "",
                mealFrequency: body.mealFrequency || "",
                foodRestrictions: body.foodRestrictions || "",
            }),
    };
    return crypto.createHash("sha256").update(JSON.stringify(relevant)).digest("hex").slice(0, 16);
}

// ── Persistent Prisma Cache ───────────────────────────────────────────────────

export async function getPersistentCache(hash: string): Promise<string | null> {
    try {
        const entry = await prisma.globalGenerationCache.findUnique({
            where: { inputHash: hash }
        });
        
        if (entry) {
            prisma.globalGenerationCache.update({
                where: { inputHash: hash },
                data: { hitCount: { increment: 1 }, lastHitAt: new Date() }
            }).catch(console.error);
            
            return entry.aiResponse;
        }
    } catch (e) {
        console.error("[Cache] Read error:", e);
    }
    return null;
}

export async function setPersistentCache(hash: string, type: "workout" | "diet", response: string): Promise<void> {
    try {
        await prisma.globalGenerationCache.upsert({
            where: { inputHash: hash },
            update: { aiResponse: response, lastHitAt: new Date() },
            create: {
                inputHash: hash,
                planType: type,
                aiResponse: response,
            }
        });
    } catch (e) {
        console.error("[Cache] Write error:", e);
    }
}

// ── Redis Deduplication Lock ──────────────────────────────────────────────────

export async function acquireLock(hash: string): Promise<boolean> {
    if (!redis) return true; // If no Redis, always assume lock acquired (no deduplication)
    try {
        // Set NX (Not Exists) lock. EX 30 ensures lock expires in 30 seconds if process crashes
        const result = await redis.set(`lock:${hash}`, "generating", { nx: true, ex: 30 });
        return result === "OK";
    } catch (e) {
         console.warn("[Redis] Lock error:", e);
         return true; // proceed anyway if redis fails
    }
}

export async function releaseLock(hash: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(`lock:${hash}`);
    } catch (e) {
         console.warn("[Redis] Unlock error:", e);
    }
}

export async function waitForCache(hash: string, timeoutMs: number = 25000): Promise<string | null> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        await new Promise(r => setTimeout(r, 1000));
        const cached = await getPersistentCache(hash);
        if (cached) return cached;
        
        if (redis) {
             const lockExists = await redis.exists(`lock:${hash}`);
             if (!lockExists) break; // Other process finished but no cache? Break and proceed.
        }
    }
    return null;
}

// Legacy compat placeholders
export function getCached(key: string): string | null { return null; }
export function setCache(key: string, data: string): void {}
export function unitCacheKey(base: string, unitId: string): string { return `${base}:${unitId}`; }
export function getCachedUnits(baseHash: string): Map<string, string> { return new Map(); }
