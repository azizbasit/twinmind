"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { GitBranch, Loader2, TrendingUp, TrendingDown, Minus, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface PersonaSnapshot {
  id: string;
  version: number;
  snapshotType: string;
  formalityScore: number;
  casualnessScore: number;
  humorScore: number;
  directnessScore: number;
  technicalDepthScore: number;
  avgMessageLength: number;
  analyticalScore: number;
  strategicScore: number;
  creativeScore: number;
  emotionalScore: number;
  dataOrientedScore: number;
  intuitiveScore: number;
  riskToleranceScore: number;
  decisionSpeedScore: number;
  plannerScore: number;
  builderScore: number;
  researcherScore: number;
  creatorScore: number;
  managerScore: number;
  introversionScore: number;
  extroversionScore: number;
  leadershipScore: number;
  collaborationScore: number;
  dataPointsAnalyzed: number;
  summaryText: string | null;
  changesFromPrev: string | null;
  createdAt: string;
}

const DISPLAY_FIELDS: { key: string; label: string; category: string }[] = [
  { key: "formalityScore", label: "Formality", category: "Communication" },
  { key: "casualnessScore", label: "Casualness", category: "Communication" },
  { key: "humorScore", label: "Humor", category: "Communication" },
  { key: "directnessScore", label: "Directness", category: "Communication" },
  { key: "technicalDepthScore", label: "Technical", category: "Communication" },
  { key: "analyticalScore", label: "Analytical", category: "Thinking" },
  { key: "strategicScore", label: "Strategic", category: "Thinking" },
  { key: "creativeScore", label: "Creative", category: "Thinking" },
  { key: "emotionalScore", label: "Emotional", category: "Thinking" },
  { key: "dataOrientedScore", label: "Data-Driven", category: "Decision" },
  { key: "riskToleranceScore", label: "Risk Tolerance", category: "Decision" },
  { key: "decisionSpeedScore", label: "Speed", category: "Decision" },
  { key: "plannerScore", label: "Planner", category: "Work" },
  { key: "builderScore", label: "Builder", category: "Work" },
  { key: "creatorScore", label: "Creator", category: "Work" },
  { key: "leadershipScore", label: "Leadership", category: "Social" },
  { key: "collaborationScore", label: "Collaboration", category: "Social" },
  { key: "introversionScore", label: "Introversion", category: "Social" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Communication: "text-violet-600 bg-violet-50",
  Thinking: "text-blue-600 bg-blue-50",
  Decision: "text-teal-600 bg-teal-50",
  Work: "text-orange-600 bg-orange-50",
  Social: "text-pink-600 bg-pink-50",
};

function DeltaChip({ delta }: { delta: number }) {
  if (Math.abs(delta) < 3) return <Minus className="h-3 w-3 text-slate-300" />;
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-green-600 text-xs font-bold">
      <TrendingUp className="h-3 w-3" />+{delta}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-red-500 text-xs font-bold">
      <TrendingDown className="h-3 w-3" />{delta}
    </span>
  );
}

export default function PersonaEvolutionPage() {
  const [snapshots, setSnapshots] = useState<PersonaSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  useEffect(() => {
    axios.get("/api/persona/snapshots")
      .then(r => {
        const snaps: PersonaSnapshot[] = r.data.snapshots;
        setSnapshots(snaps);
        if (snaps.length >= 2) {
          setSelectedA(snaps[snaps.length - 2].id);
          setSelectedB(snaps[snaps.length - 1].id);
        } else if (snaps.length === 1) {
          setSelectedB(snaps[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const snapsA = snapshots.find(s => s.id === selectedA);
  const snapsB = snapshots.find(s => s.id === selectedB);

  const categories = [...new Set(DISPLAY_FIELDS.map(f => f.category))];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <GitBranch className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Persona Evolution</h1>
          <p className="text-slate-500">
            {snapshots.length} version{snapshots.length !== 1 ? "s" : ""} tracked · See how your personality profile changes over time
          </p>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
          <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2 font-medium">No snapshots yet</p>
          <p className="text-sm text-slate-400">
            Snapshots are created weekly after your first persona analysis. Keep chatting to build your timeline.
          </p>
        </div>
      ) : (
        <>
          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-bold text-base mb-5">Version Timeline</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {snapshots.map(snap => {
                const isA = snap.id === selectedA;
                const isB = snap.id === selectedB;
                return (
                  <div
                    key={snap.id}
                    className={cn(
                      "flex-shrink-0 cursor-pointer rounded-xl border-2 p-4 transition min-w-[140px] text-center",
                      isB ? "border-violet-500 bg-violet-50" :
                      isA ? "border-blue-400 bg-blue-50" :
                      "border-slate-100 hover:border-slate-300"
                    )}
                    onClick={() => {
                      if (isB) setSelectedA(snap.id);
                      else if (isA) setSelectedA(null);
                      else setSelectedB(snap.id);
                    }}
                  >
                    <p className="text-xs text-slate-400 mb-1">V{snap.version}</p>
                    <p className="text-sm font-bold">
                      {format(new Date(snap.createdAt), "MMM d")}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 capitalize">{snap.snapshotType.toLowerCase()}</p>
                    {snap.dataPointsAnalyzed > 0 && (
                      <p className="text-[10px] text-slate-400">{snap.dataPointsAnalyzed} pts</p>
                    )}
                    {isA && <div className="mt-1.5 text-[9px] font-bold text-blue-500 uppercase">Baseline</div>}
                    {isB && <div className="mt-1.5 text-[9px] font-bold text-violet-500 uppercase">Current</div>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Click a version to set it as "Current". Click baseline to change the comparison point.
            </p>
          </div>

          {/* Comparison */}
          {snapsB && (
            <div className="space-y-6">
              {/* Summaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {snapsA && (
                  <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-blue-700 text-sm">
                        V{snapsA.version} — Baseline ({format(new Date(snapsA.createdAt), "MMM d, yyyy")})
                      </span>
                    </div>
                    {snapsA.summaryText && (
                      <p className="text-sm text-blue-800 leading-relaxed">{snapsA.summaryText}</p>
                    )}
                  </div>
                )}
                <div className="bg-violet-50 rounded-2xl border border-violet-100 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <span className="font-semibold text-violet-700 text-sm">
                      V{snapsB.version} — Current ({format(new Date(snapsB.createdAt), "MMM d, yyyy")})
                    </span>
                  </div>
                  {snapsB.summaryText && (
                    <p className="text-sm text-violet-800 leading-relaxed">{snapsB.summaryText}</p>
                  )}
                </div>
              </div>

              {/* Score comparison by category */}
              {categories.map(cat => {
                const fields = DISPLAY_FIELDS.filter(f => f.category === cat);
                const colorClass = CATEGORY_COLORS[cat] ?? "text-slate-600 bg-slate-50";
                const [textColor, bgColor] = colorClass.split(" ");

                return (
                  <div key={cat} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className={cn("text-sm font-bold uppercase tracking-wide mb-5 inline-flex items-center gap-2 px-3 py-1 rounded-full", colorClass)}>
                      {cat}
                    </h3>
                    <div className="space-y-4">
                      {fields.map(field => {
                        const scoreB = (snapsB as any)[field.key] as number;
                        const scoreA = snapsA ? (snapsA as any)[field.key] as number : null;
                        const delta = scoreA !== null ? scoreB - scoreA : 0;
                        const barColor = textColor.replace("text-", "bg-").replace("-600", "-500");

                        return (
                          <div key={field.key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium">{field.label}</span>
                              <div className="flex items-center gap-3">
                                {scoreA !== null && (
                                  <span className="text-xs text-slate-400 tabular-nums">{scoreA}</span>
                                )}
                                <DeltaChip delta={delta} />
                                <span className="text-sm font-bold tabular-nums">{scoreB}</span>
                              </div>
                            </div>
                            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                              {/* Baseline bar */}
                              {scoreA !== null && (
                                <div
                                  className="absolute top-0 left-0 h-full bg-slate-300 rounded-full"
                                  style={{ width: `${scoreA}%` }}
                                />
                              )}
                              {/* Current bar */}
                              <div
                                className={cn("absolute top-0 left-0 h-full rounded-full opacity-80 transition-all duration-700", barColor)}
                                style={{ width: `${scoreB}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Key changes */}
              {snapsB.changesFromPrev && (() => {
                try {
                  const changes = JSON.parse(snapsB.changesFromPrev);
                  const keys = Object.keys(changes);
                  if (keys.length === 0) return null;
                  return (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                      <h3 className="font-bold text-base mb-4">Notable Changes in V{snapsB.version}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {keys.map(key => {
                          const { from, to, delta } = changes[key];
                          const label = DISPLAY_FIELDS.find(f => f.key === key)?.label ?? key;
                          return (
                            <div key={key} className={cn(
                              "rounded-xl p-3 text-center",
                              delta > 0 ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
                            )}>
                              <p className="text-xs font-semibold text-slate-600 mb-1">{label}</p>
                              <p className={cn("text-lg font-bold", delta > 0 ? "text-green-600" : "text-red-500")}>
                                {delta > 0 ? "+" : ""}{delta}
                              </p>
                              <p className="text-[10px] text-slate-400">{from} → {to}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
