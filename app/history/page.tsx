"use client";
// app/history/page.tsx
// Lists all versioned plan history for the authenticated user.
// Click a version to view its input snapshot + AI response.
// Select two versions with the checkboxes to compare them side-by-side.

import { useEffect, useState } from "react";
import type { PlanHistoryRecord } from "@/lib/plan-history-schemas";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function fmt(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function JsonPane({ data }: { data: Record<string, unknown> }) {
    return (
        <pre
            style={{
                margin: 0,
                padding: "14px 16px",
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                fontSize: 11,
                lineHeight: 1.6,
                color: "var(--ink-2)",
                overflowX: "auto",
                fontFamily: "'DM Mono', monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            }}
        >
            {JSON.stringify(data, null, 2)}
        </pre>
    );
}

// ─── Version list item ────────────────────────────────────────────────────────
function VersionRow({
    record,
    isActive,
    isChecked,
    onSelect,
    onCheck,
    compareMode,
}: {
    record: PlanHistoryRecord;
    isActive: boolean;
    isChecked: boolean;
    onSelect: () => void;
    onCheck: () => void;
    compareMode: boolean;
}) {
    return (
        <div
            onClick={onSelect}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                background: isActive ? "var(--bg-2)" : "transparent",
                cursor: "pointer",
                borderLeft: isActive ? "2px solid var(--lime)" : "2px solid transparent",
                transition: "background 0.15s",
            }}
        >
            {/* Checkbox for comparison (stop propagation so row click doesn't fire) */}
            {compareMode && (
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                        e.stopPropagation();
                        onCheck();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ accentColor: "var(--lime)", flexShrink: 0, width: 14, height: 14 }}
                />
            )}

            {/* Version badge */}
            <span
                style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: "var(--lime)",
                    minWidth: 28,
                    flexShrink: 0,
                }}
            >
                v{record.versionNumber}
            </span>

            {/* Plan type */}
            <span
                style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: record.planType === "workout" ? "var(--lime)" : "var(--amber)",
                    textTransform: "uppercase",
                    flexShrink: 0,
                    minWidth: 56,
                }}
            >
                {record.planType}
            </span>

            {/* Date */}
            <span style={{ fontSize: 11, color: "var(--ink-3)", flexShrink: 0 }}>
                {fmt(record.createdAt)}
            </span>
        </div>
    );
}

// ─── Detail / compare panel ───────────────────────────────────────────────────
function DetailPanel({ record }: { record: PlanHistoryRecord }) {
    const [activeTab, setActiveTab] = useState<"input" | "output">("input");

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    flexShrink: 0,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                        style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 12,
                            color: "var(--lime)",
                        }}
                    >
                        v{record.versionNumber}
                    </span>
                    <span
                        style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                            color:
                                record.planType === "workout" ? "var(--lime)" : "var(--amber)",
                        }}
                    >
                        {record.planType}
                    </span>
                </div>
                <span style={{ fontSize: 10, color: "var(--ink-4)" }}>
                    {fmt(record.createdAt)}
                </span>
            </div>

            {/* Tabs */}
            <div
                style={{
                    display: "flex",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-2)",
                    flexShrink: 0,
                }}
            >
                {(["input", "output"] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        style={{
                            padding: "10px 18px",
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color:
                                activeTab === t ? "var(--lime)" : "var(--ink-3)",
                            borderBottom:
                                activeTab === t
                                    ? "2px solid var(--lime)"
                                    : "2px solid transparent",
                            transition: "color 0.15s",
                        }}
                    >
                        {t === "input" ? "User Input" : "AI Response"}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>
                <JsonPane
                    data={
                        activeTab === "input" ? record.inputSnapshot : record.aiResponse
                    }
                />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
    const [records, setRecords] = useState<PlanHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [active, setActive] = useState<PlanHistoryRecord | null>(null);
    const [compareMode, setCompareMode] = useState(false);
    const [selected, setSelected] = useState<string[]>([]); // up to 2 IDs

    useEffect(() => {
        fetch("/api/plan-history")
            .then((r) => r.json())
            .then((res) => {
                if (res.success) {
                    setRecords(res.data);
                    if (res.data.length > 0) setActive(res.data[0]);
                } else {
                    setError(res.error ?? "Failed to load history");
                }
            })
            .catch(() => setError("Network error"))
            .finally(() => setLoading(false));
    }, []);

    function toggleCheck(id: string) {
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 2) return [prev[1], id]; // slide window: keep latest 2
            return [...prev, id];
        });
    }

    const compareRecords =
        compareMode && selected.length === 2
            ? (selected
                .map((id) => records.find((r) => r.id === id))
                .filter(Boolean) as PlanHistoryRecord[])
            : null;

    // ── Loading / error ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    color: "var(--ink-3)",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                    letterSpacing: "0.1em",
                }}
            >
                LOADING HISTORY…
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    color: "var(--red)",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 12,
                }}
            >
                {error}
            </div>
        );
    }

    // ── Empty state ─────────────────────────────────────────────────────────────
    if (records.length === 0) {
        return (
            <div
                style={{
                    maxWidth: 640,
                    margin: "80px auto",
                    textAlign: "center",
                    padding: "0 24px",
                }}
            >
                <p
                    style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 18,
                        color: "var(--ink-3)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                    }}
                >
                    No generation history yet.
                </p>
                <p style={{ fontSize: 13, color: "var(--ink-4)", marginTop: 8 }}>
                    Generate a workout or diet plan to see it here.
                </p>
            </div>
        );
    }

    // ── Main layout ─────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 20px" }}>
            {/* Page header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 20,
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <div>
                    <h1
                        style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: 32,
                            letterSpacing: "0.14em",
                            color: "var(--ink)",
                            lineHeight: 1,
                            margin: 0,
                        }}
                    >
                        GENERATION HISTORY
                    </h1>
                    <p
                        style={{
                            fontSize: 12,
                            color: "var(--ink-3)",
                            marginTop: 6,
                            fontFamily: "'DM Mono', monospace",
                            letterSpacing: "0.06em",
                        }}
                    >
                        {records.length} version{records.length !== 1 ? "s" : ""} stored
                    </p>
                </div>

                {/* Compare toggle */}
                <button
                    onClick={() => {
                        setCompareMode((m) => !m);
                        setSelected([]);
                    }}
                    style={{
                        padding: "9px 18px",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        background: compareMode ? "var(--lime)" : "var(--bg-5)",
                        color: compareMode ? "#07080A" : "var(--ink-3)",
                        border: compareMode
                            ? "1px solid transparent"
                            : "1px solid var(--border-hi)",
                        cursor: "pointer",
                        borderRadius: 3,
                        transition: "all 0.2s",
                    }}
                >
                    {compareMode ? "✕ EXIT COMPARE" : "COMPARE VERSIONS"}
                </button>
            </div>

            {/* Compare hint */}
            {compareMode && (
                <div
                    style={{
                        padding: "10px 14px",
                        background: "rgba(200,241,53,0.06)",
                        border: "1px solid rgba(200,241,53,0.18)",
                        marginBottom: 16,
                        fontSize: 12,
                        color: "var(--lime)",
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: "0.06em",
                    }}
                >
                    SELECT 2 VERSIONS TO COMPARE — {selected.length}/2 SELECTED
                </div>
            )}

            {/* Body — sidebar + detail */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "260px 1fr",
                    gap: 0,
                    border: "1px solid var(--border)",
                    minHeight: 560,
                }}
            >
                {/* ── Version list sidebar ─────────────────────────────────────────── */}
                <div
                    style={{
                        borderRight: "1px solid var(--border)",
                        overflowY: "auto",
                        maxHeight: 700,
                    }}
                >
                    <div
                        style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid var(--border)",
                            background: "var(--bg-2)",
                        }}
                    >
                        <span
                            style={{
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.14em",
                                color: "var(--ink-3)",
                                textTransform: "uppercase",
                            }}
                        >
                            VERSIONS
                        </span>
                    </div>
                    {records.map((r) => (
                        <VersionRow
                            key={r.id}
                            record={r}
                            isActive={!compareMode && active?.id === r.id}
                            isChecked={selected.includes(r.id)}
                            onSelect={() => {
                                if (!compareMode) setActive(r);
                            }}
                            onCheck={() => toggleCheck(r.id)}
                            compareMode={compareMode}
                        />
                    ))}
                </div>

                {/* ── Detail / compare panel ───────────────────────────────────────── */}
                <div style={{ overflow: "hidden" }}>
                    {compareRecords ? (
                        // Side-by-side comparison
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
                            {compareRecords.map((r) => (
                                <div
                                    key={r.id}
                                    style={{
                                        borderRight: "1px solid var(--border)",
                                        overflow: "auto",
                                        height: "100%",
                                    }}
                                >
                                    <DetailPanel record={r} />
                                </div>
                            ))}
                        </div>
                    ) : active ? (
                        <DetailPanel record={active} />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                color: "var(--ink-4)",
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 11,
                                letterSpacing: "0.1em",
                            }}
                        >
                            SELECT A VERSION
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}