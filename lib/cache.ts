// lib/cache.ts — Per-unit cache with input hashing
// Caches at both full-plan and per-day/per-meal granularity

import crypto from "crypto";

interface CacheEntry {
    data: string;
    ts: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, CacheEntry>();

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

/** Per-unit cache key: base hash + unit identifier (e.g., "Mon" or "Breakfast") */
export function unitCacheKey(baseHash: string, unitId: string): string {
    return `${baseHash}:${unitId}`;
}

export function getCached(key: string): string | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

export function setCache(key: string, data: string): void {
    if (cache.size > 200) {
        const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest) cache.delete(oldest[0]);
    }
    cache.set(key, { data, ts: Date.now() });
}

/** Get all cached units matching a base hash prefix */
export function getCachedUnits(baseHash: string): Map<string, string> {
    const results = new Map<string, string>();
    for (const [key, entry] of cache.entries()) {
        if (key.startsWith(baseHash + ":") && Date.now() - entry.ts <= CACHE_TTL_MS) {
            const unitId = key.slice(baseHash.length + 1);
            results.set(unitId, entry.data);
        }
    }
    return results;
}
