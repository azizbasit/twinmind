import { Brain, MessageSquare, Upload, ArrowRight, Zap, Target, Star, Mic, Sparkles, BarChart2 } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";

async function getPersonaStrength(userId: string): Promise<number> {
  const [memoriesByType, totalMemories, integrations] = await Promise.all([
    db.memory.groupBy({ by: ["type"], where: { userId } }),
    db.memory.count({ where: { userId } }),
    db.integration.count({ where: { userId } }),
  ]);
  const typeBonus = Math.min(memoriesByType.length * 10, 40);
  const memBonus = Math.min(totalMemories * 2, 40);
  const intBonus = Math.min(integrations * 10, 20);
  return Math.min(typeBonus + memBonus + intBonus, 100);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [conversationsCount, memoriesCount, integrationsCount, personaStrength] = await Promise.all([
    db.conversation.count({ where: { userId: user?.id } }),
    db.memory.count({ where: { userId: user?.id } }),
    db.integration.count({ where: { userId: user?.id } }),
    getPersonaStrength(user?.id ?? ""),
  ]);

  const stats = [
    { label: "Conversations", value: conversationsCount, icon: MessageSquare, color: "text-violet-600", bgColor: "bg-violet-100" },
    { label: "Stored Memories", value: memoriesCount, icon: Brain, color: "text-pink-600", bgColor: "bg-pink-100" },
    { label: "Connected Accounts", value: integrationsCount, icon: Zap, color: "text-orange-600", bgColor: "bg-orange-100" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
        <p className="text-slate-500">Your digital twin is learning from your interactions and documents.</p>
      </div>

      {/* Persona Strength Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Persona Strength</span>
          </div>
          <span className="text-2xl font-bold">{personaStrength}%</span>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all"
            style={{ width: `${personaStrength}%` }}
          />
        </div>
        <p className="text-xs text-white/70 mt-2">
          {personaStrength < 30
            ? "Just getting started — keep chatting and uploading to train your twin."
            : personaStrength < 60
            ? "Making good progress — connect social accounts to accelerate learning."
            : personaStrength < 80
            ? "Your twin is becoming well-trained. Add more data to reach full strength."
            : "Excellent! Your digital twin closely mirrors your personality."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xl font-bold flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { href: "/chat", icon: MessageSquare, label: "Chat with Twin", desc: "Continue your last conversation", colors: "bg-violet-100 group-hover:bg-violet-200 text-violet-600", border: "hover:border-violet-200 hover:bg-violet-50" },
              { href: "/voice", icon: Mic, label: "Voice Journal", desc: "Record your thoughts and train your twin", colors: "bg-red-100 group-hover:bg-red-200 text-red-600", border: "hover:border-red-200 hover:bg-red-50" },
              { href: "/upload", icon: Upload, label: "Add Knowledge", desc: "Upload documents or WhatsApp chats", colors: "bg-orange-100 group-hover:bg-orange-200 text-orange-600", border: "hover:border-orange-200 hover:bg-orange-50" },
              { href: "/persona", icon: Sparkles, label: "Draft a Post", desc: "Generate content in your voice", colors: "bg-purple-100 group-hover:bg-purple-200 text-purple-600", border: "hover:border-purple-200 hover:bg-purple-50" },
              { href: "/memories", icon: Brain, label: "Review Memories", desc: "Manage what your twin remembers", colors: "bg-pink-100 group-hover:bg-pink-200 text-pink-600", border: "hover:border-pink-200 hover:bg-pink-50" },
            ].map(action => (
              <Link
                key={action.href}
                href={action.href}
                className={`group p-4 rounded-lg border border-slate-100 ${action.border} transition flex items-center justify-between`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-md transition ${action.colors}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-current transition" />
              </Link>
            ))}
          </div>
        </div>

        {/* Learning Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xl font-bold flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-500" />
            Learning Status
          </h2>
          <div className="space-y-5">
            {[
              { label: "Personality Mirroring", value: Math.min(personaStrength + 10, 100) },
              { label: "Knowledge Depth", value: Math.min(memoriesCount * 3, 100) },
              { label: "Social Voice", value: Math.min(integrationsCount * 30, 100) },
            ].map(item => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}

            <Link
              href="/analytics"
              className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium transition mt-2"
            >
              <BarChart2 className="h-4 w-4" />
              View full analytics →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
