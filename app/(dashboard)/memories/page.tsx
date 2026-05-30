"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Brain, Calendar, Star, Tag, Trash2, Pencil,
  CheckCircle, X, Loader2, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Memory {
  id: string;
  content: string;
  type: string;
  importanceScore: number;
  source: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  PERSONALITY: "bg-violet-100 text-violet-700",
  PREFERENCE: "bg-blue-100 text-blue-700",
  KNOWLEDGE: "bg-teal-100 text-teal-700",
  BEHAVIOR: "bg-orange-100 text-orange-700",
  GOALS: "bg-green-100 text-green-700",
  EVENTS: "bg-pink-100 text-pink-700",
};

const ALL_TYPES = ["PERSONALITY", "PREFERENCE", "KNOWLEDGE", "BEHAVIOR", "GOALS", "EVENTS"];

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScore, setEditScore] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await axios.get("/api/memory");
      setMemories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (m: Memory) => {
    setEditingId(m.id);
    setEditContent(m.content);
    setEditScore(m.importanceScore);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      await axios.patch(`/api/memory/${id}`, { content: editContent, importanceScore: editScore });
      setMemories(prev =>
        prev.map(m => m.id === id ? { ...m, content: editContent, importanceScore: editScore } : m)
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const deleteMemory = async (id: string) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/memory/${id}`);
      setMemories(prev => prev.filter(m => m.id !== id));
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map(id => axios.delete(`/api/memory/${id}`)));
      setMemories(prev => prev.filter(m => !selected.has(m.id)));
      setSelected(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = typeFilter === "ALL" ? memories : memories.filter(m => m.type === typeFilter);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-pink-100 rounded-lg">
          <Brain className="h-6 w-6 text-pink-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Memory Bank</h1>
          <p className="text-slate-500">{memories.length} memories stored · Your twin's long-term knowledge.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter className="h-4 w-4" />
        </div>
        {["ALL", ...ALL_TYPES].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition",
              typeFilter === t
                ? "bg-violet-600 text-white"
                : (t !== "ALL" && TYPE_COLORS[t]) ? `${TYPE_COLORS[t]} hover:opacity-80` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            {t === "ALL" ? ` (${memories.length})` : ` (${memories.filter(m => m.type === t).length})`}
          </button>
        ))}

        {selected.size > 0 && (
          <button
            onClick={bulkDelete}
            disabled={bulkDeleting}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
          >
            {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete {selected.size} selected
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
          <Brain className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {typeFilter !== "ALL" ? `No ${typeFilter.toLowerCase()} memories yet.` : "No memories found. Start chatting to build your twin's mind."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(memory => (
            <div
              key={memory.id}
              className={cn(
                "bg-white p-5 rounded-xl shadow-sm border flex flex-col justify-between transition",
                selected.has(memory.id) ? "border-violet-400 ring-1 ring-violet-300" : "border-slate-100 hover:border-slate-200"
              )}
            >
              {editingId === memory.id ? (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 resize-none focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">Score:</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={editScore}
                      onChange={e => setEditScore(Number(e.target.value))}
                      className="w-16 text-sm border border-slate-200 rounded p-1 text-center"
                    />
                    <span className="text-xs text-slate-400">/10</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(memory.id)}
                      disabled={savingId === memory.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {savingId === memory.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50 transition"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleSelect(memory.id)}
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition",
                            selected.has(memory.id) ? "bg-violet-600 border-violet-600" : "border-slate-300 hover:border-violet-400"
                          )}
                        >
                          {selected.has(memory.id) && <CheckCircle className="h-3 w-3 text-white" />}
                        </button>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", TYPE_COLORS[memory.type] ?? "bg-slate-100 text-slate-600")}>
                          {memory.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="text-xs font-bold">{memory.importanceScore}/10</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mb-3">{memory.content}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(memory.createdAt), "PP")}
                      {memory.source && memory.source !== "CHAT" && (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase">
                          {memory.source.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(memory)}
                        className="p-1 text-slate-400 hover:text-violet-600 transition"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMemory(memory.id)}
                        disabled={deletingId === memory.id}
                        className="p-1 text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === memory.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
