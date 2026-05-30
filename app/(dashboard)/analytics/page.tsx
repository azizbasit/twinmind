"use client";

import { useState, useEffect } from "react";
import { BarChart2, Brain, MessageSquare, Zap, Sparkles, Loader2, TrendingUp } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

interface Analytics {
  totalMemories: number;
  totalConversations: number;
  totalMessages: number;
  memoriesByType: { type: string; count: string }[];
  memoriesBySource: { source: string; count: string }[];
  draftCounts: { status: string; count: string }[];
  integrations: { provider: string; createdAt: string }[];
  recentMemories: { createdAt: string; type: string; importanceScore: number }[];
  personaStrength: number;
}

const TYPE_COLORS: Record<string, string> = {
  PERSONALITY: "bg-violet-500",
  PREFERENCE: "bg-blue-500",
  KNOWLEDGE: "bg-teal-500",
  BEHAVIOR: "bg-orange-500",
  GOALS: "bg-green-500",
  EVENTS: "bg-pink-500",
};

const SOURCE_COLORS: Record<string, string> = {
  CHAT: "bg-violet-400",
  DOCUMENT: "bg-orange-400",
  WHATSAPP: "bg-green-500",
  VOICE: "bg-red-400",
  SOCIAL: "bg-blue-500",
  MANUAL: "bg-slate-400",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/analytics").then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;

  const maxTypeCount = Math.max(...data.memoriesByType.map(t => Number(t.count)), 1);
  const maxSourceCount = Math.max(...data.memoriesBySource.map(s => Number(s.count)), 1);

  const draftMap = Object.fromEntries(data.draftCounts.map(d => [d.status, Number(d.count)]));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-sky-100 rounded-lg">
          <BarChart2 className="h-6 w-6 text-sky-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-slate-500">How well does your twin know you?</p>
        </div>
      </div>

      {/* Persona Strength */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h2 className="font-semibold text-lg">Persona Strength</h2>
          </div>
          <span className="text-3xl font-bold text-violet-600">{data.personaStrength}%</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${data.personaStrength}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>Just started</span>
          <span>Well trained</span>
          <span>Your twin</span>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Increases with more memories, diverse memory types, and connected social integrations.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Memories", value: data.totalMemories, icon: Brain, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Conversations", value: data.totalConversations, icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Messages", value: data.totalMessages, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Integrations", value: data.integrations.length, icon: Zap, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", s.bg)}>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memories by type */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold mb-4">Memories by Type</h2>
          {data.memoriesByType.length === 0 ? (
            <p className="text-sm text-slate-400">No memories yet.</p>
          ) : (
            <div className="space-y-3">
              {data.memoriesByType.map(t => (
                <div key={t.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{t.type.toLowerCase()}</span>
                    <span className="text-slate-500">{t.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", TYPE_COLORS[t.type] ?? "bg-slate-400")}
                      style={{ width: `${(Number(t.count) / maxTypeCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Memories by source */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold mb-4">Memories by Source</h2>
          {data.memoriesBySource.length === 0 ? (
            <p className="text-sm text-slate-400">No memories yet.</p>
          ) : (
            <div className="space-y-3">
              {data.memoriesBySource.map(s => (
                <div key={s.source} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">{s.source.toLowerCase()}</span>
                    <span className="text-slate-500">{s.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", SOURCE_COLORS[s.source] ?? "bg-slate-400")}
                      style={{ width: `${(Number(s.count) / maxSourceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Draft stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold mb-4">Persona Drafts</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Pending", key: "PENDING", color: "bg-yellow-100 text-yellow-700" },
              { label: "Approved", key: "APPROVED", color: "bg-green-100 text-green-700" },
              { label: "Posted", key: "POSTED", color: "bg-blue-100 text-blue-700" },
              { label: "Rejected", key: "REJECTED", color: "bg-red-100 text-red-700" },
            ].map(d => (
              <div key={d.key} className={cn("rounded-lg p-3 text-center", d.color)}>
                <p className="text-2xl font-bold">{draftMap[d.key] ?? 0}</p>
                <p className="text-xs font-medium">{d.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Connected integrations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold mb-4">Connected Accounts</h2>
          {data.integrations.length === 0 ? (
            <p className="text-sm text-slate-400">
              No social accounts connected yet.{" "}
              <a href="/settings?tab=integrations" className="text-violet-600 hover:underline">Connect now →</a>
            </p>
          ) : (
            <div className="space-y-3">
              {data.integrations.map(i => (
                <div key={i.provider} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {i.provider[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium capitalize text-sm">{i.provider}</p>
                    <p className="text-xs text-slate-400">
                      Connected {new Date(i.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
