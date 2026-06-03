"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Brain, Loader2, RefreshCw, Sparkles, MessageSquare,
  Lightbulb, Target, Briefcase, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaProfile {
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
  lastAnalyzedAt: string | null;
  summaryText: string | null;
}

interface DimensionField {
  key: keyof PersonaProfile;
  label: string;
  desc: string;
  lowLabel?: string;
  highLabel?: string;
}

const SECTIONS: {
  id: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  fields: DimensionField[];
}[] = [
  {
    id: "communication",
    label: "Communication Style",
    icon: MessageSquare,
    color: "text-violet-600",
    bg: "bg-violet-100",
    fields: [
      { key: "formalityScore", label: "Formality", desc: "Professional language", lowLabel: "Casual", highLabel: "Formal" },
      { key: "casualnessScore", label: "Casualness", desc: "Relaxed conversational tone", lowLabel: "Stiff", highLabel: "Very Casual" },
      { key: "humorScore", label: "Humor", desc: "Use of wit and humor", lowLabel: "Serious", highLabel: "Humorous" },
      { key: "directnessScore", label: "Directness", desc: "Direct vs indirect expression", lowLabel: "Indirect", highLabel: "Very Direct" },
      { key: "technicalDepthScore", label: "Technical Depth", desc: "Use of technical vocabulary", lowLabel: "Layman", highLabel: "Expert" },
      { key: "avgMessageLength", label: "Message Length", desc: "Tendency for longer messages", lowLabel: "Brief", highLabel: "Detailed" },
    ],
  },
  {
    id: "thinking",
    label: "Thinking Style",
    icon: Lightbulb,
    color: "text-blue-600",
    bg: "bg-blue-100",
    fields: [
      { key: "analyticalScore", label: "Analytical", desc: "Data and logic-driven", lowLabel: "Intuitive", highLabel: "Highly Analytical" },
      { key: "strategicScore", label: "Strategic", desc: "Long-term planning", lowLabel: "Reactive", highLabel: "Strategic" },
      { key: "creativeScore", label: "Creative", desc: "Novel ideas and approaches", lowLabel: "Conventional", highLabel: "Highly Creative" },
      { key: "emotionalScore", label: "Emotional", desc: "Emotion in reasoning", lowLabel: "Stoic", highLabel: "Emotionally Expressive" },
    ],
  },
  {
    id: "decision",
    label: "Decision Style",
    icon: Target,
    color: "text-teal-600",
    bg: "bg-teal-100",
    fields: [
      { key: "dataOrientedScore", label: "Data-Driven", desc: "Relies on data", lowLabel: "Gut-Feel", highLabel: "Data-Driven" },
      { key: "intuitiveScore", label: "Intuitive", desc: "Intuition-based decisions", lowLabel: "Needs Proof", highLabel: "Very Intuitive" },
      { key: "riskToleranceScore", label: "Risk Tolerance", desc: "Comfort with uncertainty", lowLabel: "Risk-Averse", highLabel: "Risk-Taker" },
      { key: "decisionSpeedScore", label: "Decision Speed", desc: "Quick vs deliberate", lowLabel: "Deliberate", highLabel: "Very Fast" },
    ],
  },
  {
    id: "work",
    label: "Work Style",
    icon: Briefcase,
    color: "text-orange-600",
    bg: "bg-orange-100",
    fields: [
      { key: "plannerScore", label: "Planner", desc: "Plans ahead", lowLabel: "Improviser", highLabel: "Detailed Planner" },
      { key: "builderScore", label: "Builder", desc: "Hands-on execution", lowLabel: "Delegator", highLabel: "Builder" },
      { key: "researcherScore", label: "Researcher", desc: "Information-gathering", lowLabel: "Acts First", highLabel: "Deep Researcher" },
      { key: "creatorScore", label: "Creator", desc: "Content & creative output", lowLabel: "Consumer", highLabel: "Prolific Creator" },
      { key: "managerScore", label: "Manager", desc: "Coordinating others", lowLabel: "Individual", highLabel: "Manager/Leader" },
    ],
  },
  {
    id: "social",
    label: "Social Style",
    icon: Users,
    color: "text-pink-600",
    bg: "bg-pink-100",
    fields: [
      { key: "introversionScore", label: "Introversion", desc: "Energy from solitude", lowLabel: "Extroverted", highLabel: "Introverted" },
      { key: "extroversionScore", label: "Extroversion", desc: "Energy from people", lowLabel: "Introverted", highLabel: "Extroverted" },
      { key: "leadershipScore", label: "Leadership", desc: "Initiative & leading", lowLabel: "Follower", highLabel: "Natural Leader" },
      { key: "collaborationScore", label: "Collaboration", desc: "Team preference", lowLabel: "Solo", highLabel: "Collaborative" },
    ],
  },
];

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const barColor =
    color === "violet" ? "bg-violet-500" :
    color === "blue" ? "bg-blue-500" :
    color === "teal" ? "bg-teal-500" :
    color === "orange" ? "bg-orange-500" : "bg-pink-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right tabular-nums">{pct}</span>
    </div>
  );
}

export default function PersonalityPage() {
  const [profile, setProfile] = useState<PersonaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get("/api/persona/profile");
      setProfile(res.data.profile);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await axios.post("/api/persona/analyze");
      setProfile(res.data.profile);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <Brain className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Personality Profile</h1>
            <p className="text-slate-500">
              {profile
                ? `Analyzed from ${profile.dataPointsAnalyzed} data points · Last updated ${profile.lastAnalyzedAt ? new Date(profile.lastAnalyzedAt).toLocaleDateString() : "never"}`
                : "Run your first analysis to build your personality profile"}
            </p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {analyzing ? "Analyzing…" : profile ? "Re-analyze" : "Run Analysis"}
        </button>
      </div>

      {!profile ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2 font-medium">No personality profile yet</p>
          <p className="text-sm text-slate-400">Chat with your twin or upload documents, then run analysis.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          {profile.summaryText && (
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">Personality Summary</span>
              </div>
              <p className="text-white/90 leading-relaxed">{profile.summaryText}</p>
            </div>
          )}

          {/* Dimension sections */}
          {SECTIONS.map(section => (
            <div key={section.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={cn("p-2 rounded-lg", section.bg)}>
                  <section.icon className={cn("h-5 w-5", section.color)} />
                </div>
                <h2 className="text-lg font-bold">{section.label}</h2>
              </div>
              <div className="space-y-5">
                {section.fields.map(field => {
                  const score = profile[field.key] as number;
                  const colorKey = section.color.replace("text-", "").replace("-600", "");
                  return (
                    <div key={field.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-sm font-semibold">{field.label}</span>
                          <span className="text-xs text-slate-400 ml-2">{field.desc}</span>
                        </div>
                        {field.lowLabel && (
                          <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span>{field.lowLabel}</span>
                            <span>→</span>
                            <span>{field.highLabel}</span>
                          </div>
                        )}
                      </div>
                      <ScoreBar score={score} color={colorKey} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
