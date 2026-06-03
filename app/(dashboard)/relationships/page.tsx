"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  Users, Loader2, RefreshCw, Heart, Briefcase, GraduationCap,
  Star, TrendingUp, TrendingDown, Minus, Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  aliases: string | null;
  relationshipType: string | null;
  importanceScore: number;
  interactionCount: number;
  sentimentScore: number;
  communicationNotes: string | null;
  userCorrected: boolean;
  lastInteractionAt: string | null;
}

const RELATIONSHIP_ICONS: Record<string, any> = {
  friend: Heart,
  family: Heart,
  colleague: Briefcase,
  client: Briefcase,
  mentor: GraduationCap,
  other: Users,
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  friend: "bg-pink-100 text-pink-700",
  family: "bg-red-100 text-red-700",
  colleague: "bg-blue-100 text-blue-700",
  client: "bg-teal-100 text-teal-700",
  mentor: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-600",
};

function SentimentBadge({ score }: { score: number }) {
  if (score > 0.3) return (
    <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
      <TrendingUp className="h-3 w-3" /> Positive
    </span>
  );
  if (score < -0.2) return (
    <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
      <TrendingDown className="h-3 w-3" /> Tension
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
      <Minus className="h-3 w-3" /> Neutral
    </span>
  );
}

function ImportanceStars({ score }: { score: number }) {
  const filled = Math.round(score * 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn("h-3 w-3", i <= filled ? "text-yellow-400 fill-yellow-400" : "text-slate-200")}
        />
      ))}
    </div>
  );
}

export default function RelationshipsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ relationshipType: string; communicationNotes: string }>({
    relationshipType: "",
    communicationNotes: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await axios.get("/api/relationships");
      setContacts(res.data.contacts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runExtraction = async () => {
    setExtracting(true);
    try {
      await axios.post("/api/persona/analyze");
      await fetchContacts();
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditData({
      relationshipType: contact.relationshipType ?? "other",
      communicationNotes: contact.communicationNotes ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await axios.patch(`/api/relationships/${id}`, editData);
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...res.data.contact } : c));
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
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
          <div className="p-2 bg-pink-100 rounded-lg">
            <Users className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Relationship Intelligence</h1>
            <p className="text-slate-500">
              {contacts.length} people identified · How you relate to them
            </p>
          </div>
        </div>
        <button
          onClick={runExtraction}
          disabled={extracting}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {extracting ? "Analyzing…" : "Re-analyze"}
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2 font-medium">No relationships identified yet</p>
          <p className="text-sm text-slate-400">
            Chat with your twin about people in your life, then click Re-analyze.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {contacts.map(contact => {
            const relType = contact.relationshipType ?? "other";
            const Icon = RELATIONSHIP_ICONS[relType] ?? Users;
            const colorClass = RELATIONSHIP_COLORS[relType] ?? RELATIONSHIP_COLORS.other;
            const isEditing = editingId === contact.id;

            return (
              <div
                key={contact.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl", colorClass.split(" ")[0])}>
                      <Icon className={cn("h-5 w-5", colorClass.split(" ")[1])} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{contact.name}</h3>
                      {contact.aliases && (() => {
                        try {
                          const aliases: string[] = JSON.parse(contact.aliases);
                          return aliases.length > 0 ? (
                            <p className="text-xs text-slate-400">aka {aliases.join(", ")}</p>
                          ) : null;
                        } catch { return null; }
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => isEditing ? setEditingId(null) : startEdit(contact)}
                    className="p-1.5 text-slate-400 hover:text-violet-600 transition"
                  >
                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Relationship Type</label>
                      <select
                        value={editData.relationshipType}
                        onChange={e => setEditData(p => ({ ...p, relationshipType: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        {["friend", "family", "colleague", "client", "mentor", "other"].map(t => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Notes</label>
                      <textarea
                        rows={2}
                        value={editData.communicationNotes}
                        onChange={e => setEditData(p => ({ ...p, communicationNotes: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 resize-none focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={() => saveEdit(contact.id)}
                      disabled={savingId === contact.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {savingId === contact.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Meta row */}
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full capitalize", colorClass)}>
                        {relType}
                      </span>
                      <SentimentBadge score={contact.sentimentScore} />
                    </div>

                    {/* Importance */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Importance</span>
                      <ImportanceStars score={contact.importanceScore} />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-slate-700">{contact.interactionCount}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Mentions</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-slate-700">
                          {contact.sentimentScore > 0.3 ? "😊" : contact.sentimentScore < -0.2 ? "😟" : "😐"}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Sentiment</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {contact.communicationNotes && (
                      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                        {contact.communicationNotes}
                      </p>
                    )}

                    {contact.userCorrected && (
                      <p className="text-[10px] text-violet-500 font-medium">✓ User verified</p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
