import { Brain, MessageSquare, Upload, Calendar, ArrowRight, Zap, Target, Star } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Fetch some basic stats
  const [conversationsCount, memoriesCount] = await Promise.all([
    db.conversation.count({ where: { userId: user?.id } }),
    db.memory.count({ where: { userId: user?.id } }),
  ]);

  const stats = [
    {
      label: "Conversations",
      value: conversationsCount,
      icon: MessageSquare,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
    },
    {
      label: "Stored Memories",
      value: memoriesCount,
      icon: Brain,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
    {
      label: "Connected Tools",
      value: 0,
      icon: Zap,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
        <p className="text-slate-500">
          Your digital twin is learning from your interactions and documents.
        </p>
      </div>

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
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Link 
              href="/chat" 
              className="group p-4 rounded-lg border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-violet-100 rounded-md group-hover:bg-violet-200 transition">
                  <MessageSquare className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold">Chat with Twin</p>
                  <p className="text-xs text-slate-500">Continue your last conversation</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-violet-600 transition" />
            </Link>

            <Link 
              href="/upload" 
              className="group p-4 rounded-lg border border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-md group-hover:bg-orange-200 transition">
                  <Upload className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold">Add Knowledge</p>
                  <p className="text-xs text-slate-500">Upload documents to train your twin</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 transition" />
            </Link>

            <Link 
              href="/memories" 
              className="group p-4 rounded-lg border border-slate-100 hover:border-pink-200 hover:bg-pink-50 transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-100 rounded-md group-hover:bg-pink-200 transition">
                  <Brain className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-semibold">Review Memories</p>
                  <p className="text-xs text-slate-500">Manage what your twin remembers</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-pink-600 transition" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xl font-bold flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-500" />
            Learning Status
          </h2>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Personality Mirroring</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[45%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Knowledge Depth</span>
                <span className="font-medium">20%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[20%]" />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                Tip: The more you chat and the more documents you upload, the better TwinMind becomes at representing your unique digital presence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
