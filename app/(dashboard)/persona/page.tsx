"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Loader2, CheckCircle, XCircle, Send,
  Clock, RotateCcw, Volume2, Square,
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

type Platform = "linkedin" | "twitter" | "instagram";
type DraftStatus = "PENDING" | "APPROVED" | "REJECTED" | "POSTED";

interface Draft {
  id: string;
  platform: Platform;
  content: string;
  topic?: string;
  status: DraftStatus;
  createdAt: string;
}

const PLATFORM_META: Record<Platform, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  linkedin: { label: "LinkedIn", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", icon: <span className="font-bold text-xs">in</span> },
  twitter: { label: "X (Twitter)", color: "text-slate-700", bgColor: "bg-slate-50 border-slate-200", icon: <span className="font-bold text-xs">𝕏</span> },
  instagram: { label: "Instagram", color: "text-pink-600", bgColor: "bg-pink-50 border-pink-200", icon: <span className="font-bold text-xs">ig</span> },
};

export default function PersonaPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "ALL">("ALL");
  const [speakingDraftId, setSpeakingDraftId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { loadDrafts(); }, []);

  const loadDrafts = async () => {
    try {
      const [pending, approved, posted, rejected] = await Promise.all([
        axios.get("/api/persona/draft?status=PENDING"),
        axios.get("/api/persona/draft?status=APPROVED"),
        axios.get("/api/persona/draft?status=POSTED"),
        axios.get("/api/persona/draft?status=REJECTED"),
      ]);
      setDrafts([
        ...pending.data.drafts,
        ...approved.data.drafts,
        ...posted.data.drafts,
        ...rejected.data.drafts,
      ]);
    } catch {}
  };

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await axios.post("/api/persona/draft", { topic, platform });
      setDrafts(prev => [res.data.draft, ...prev]);
      setTopic("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to generate post");
    } finally {
      setGenerating(false);
    }
  };

  const performAction = async (id: string, action: "approve" | "reject" | "post") => {
    setActionLoading(`${id}-${action}`);
    try {
      await axios.patch(`/api/persona/draft/${id}`, { action });
      setDrafts(prev =>
        prev.map(d =>
          d.id === id
            ? { ...d, status: action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "POSTED" }
            : d
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const speakDraft = async (draft: Draft) => {
    if (speakingDraftId === draft.id) {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      setSpeakingDraftId(null);
      return;
    }
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    setSpeakingDraftId(draft.id);
    setError("");
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.content }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setSpeakingDraftId(null); currentAudioRef.current = null; };
      audio.play();
    } catch (err: any) {
      setError(err.message || "Speech generation failed. Make sure your Voice Clone is set up.");
      setSpeakingDraftId(null);
    }
  };

  const deleteDraft = async (id: string) => {
    setActionLoading(`${id}-delete`);
    try {
      await axios.delete(`/api/persona/draft/${id}`);
      setDrafts(prev => prev.filter(d => d.id !== id));
    } catch {} finally { setActionLoading(null); }
  };

  const filtered = statusFilter === "ALL" ? drafts : drafts.filter(d => d.status === statusFilter);

  const counts = {
    ALL: drafts.length,
    PENDING: drafts.filter(d => d.status === "PENDING").length,
    APPROVED: drafts.filter(d => d.status === "APPROVED").length,
    POSTED: drafts.filter(d => d.status === "POSTED").length,
    REJECTED: drafts.filter(d => d.status === "REJECTED").length,
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Sparkles className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Persona Mode</h1>
          <p className="text-slate-500">Generate posts in your voice. Review before publishing.</p>
        </div>
      </div>

      {/* Generate panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-lg">Draft a Post</h2>
        <div className="flex gap-2">
          {(["linkedin", "twitter", "instagram"] as Platform[]).map(p => {
            const meta = PLATFORM_META[p];
            return (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition",
                  platform === p ? `${meta.bgColor} ${meta.color} border-current` : "border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
        <textarea
          rows={2}
          placeholder="What do you want to post about? (e.g. 'my thoughts on remote work', 'a lesson I learned this week')"
          className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          disabled={generating}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={generate}
          disabled={generating || !topic.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Generating..." : "Generate in My Voice"}
        </button>
      </div>

      {/* Drafts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Draft Queue</h2>
          <button onClick={loadDrafts} className="text-slate-400 hover:text-slate-600 transition">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(["ALL", "PENDING", "APPROVED", "POSTED", "REJECTED"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition",
                statusFilter === s ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s]})
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No drafts yet. Generate your first post above.</p>
          </div>
        )}

        {filtered.map(draft => {
          const meta = PLATFORM_META[draft.platform as Platform] ?? PLATFORM_META.linkedin;
          return (
            <div key={draft.id} className={cn("bg-white rounded-xl border shadow-sm p-5 space-y-3", meta.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn("flex items-center gap-1 font-medium", meta.color)}>
                    {meta.icon} {meta.label}
                  </span>
                  {draft.topic && <span className="text-slate-400">· {draft.topic}</span>}
                </div>
                <StatusBadge status={draft.status} />
              </div>

              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border border-slate-100">
                {draft.content}
              </p>

              {/* Speak in cloned voice */}
              <button
                onClick={() => speakDraft(draft)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition",
                  speakingDraftId === draft.id
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    : "border-violet-200 text-violet-600 hover:bg-violet-50"
                )}
              >
                {speakingDraftId === draft.id ? (
                  <><Square className="h-3 w-3 fill-current" /> Stop</>
                ) : (
                  <><Volume2 className="h-3 w-3" /> Hear in My Voice</>
                )}
              </button>

              {draft.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => performAction(draft.id, "approve")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {actionLoading === `${draft.id}-approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => performAction(draft.id, "reject")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {actionLoading === `${draft.id}-reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                    Reject
                  </button>
                </div>
              )}

              {draft.status === "APPROVED" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => performAction(draft.id, "post")}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {actionLoading === `${draft.id}-post` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Post Now
                  </button>
                  <button
                    onClick={() => deleteDraft(draft.id)}
                    className="text-sm text-slate-400 hover:text-slate-600 px-3 py-2 transition"
                  >
                    Delete
                  </button>
                </div>
              )}

              {(draft.status === "REJECTED" || draft.status === "POSTED") && (
                <button
                  onClick={() => deleteDraft(draft.id)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DraftStatus }) {
  const map: Record<DraftStatus, { label: string; className: string; icon: React.ReactNode }> = {
    PENDING: { label: "Pending Review", className: "bg-yellow-100 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
    APPROVED: { label: "Approved", className: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700", icon: <XCircle className="h-3 w-3" /> },
    POSTED: { label: "Posted", className: "bg-blue-100 text-blue-700", icon: <Send className="h-3 w-3" /> },
  };
  const m = map[status];
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", m.className)}>
      {m.icon} {m.label}
    </span>
  );
}
