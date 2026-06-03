"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Brain, Upload, Settings,
  LogOut, Mic, Sparkles, BarChart2, Users, GitBranch, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
  { label: "Chat", icon: MessageSquare, href: "/chat", color: "text-violet-500" },
  { label: "Voice Journal", icon: Mic, href: "/voice", color: "text-red-400" },
  { label: "Memories", icon: Brain, href: "/memories", color: "text-pink-500" },
  { label: "Upload", icon: Upload, href: "/upload", color: "text-orange-500" },
  { label: "Persona", icon: Sparkles, href: "/persona", color: "text-purple-400" },
  { label: "Analytics", icon: BarChart2, href: "/analytics", color: "text-sky-400" },
];

const insightRoutes = [
  { label: "Personality", icon: UserCircle, href: "/personality", color: "text-violet-400" },
  { label: "Relationships", icon: Users, href: "/relationships", color: "text-pink-400" },
  { label: "Persona Evolution", icon: GitBranch, href: "/persona-evolution", color: "text-indigo-400" },
];

const settingsRoutes = [
  { label: "Settings", icon: Settings, href: "/settings", color: "text-slate-400" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderLinks = (items: typeof routes) =>
    items.map(route => (
      <Link
        key={route.label}
        href={route.href}
        className={cn(
          "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
          pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
        )}
      >
        <div className="flex items-center flex-1">
          <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
          {route.label}
        </div>
      </Link>
    ));

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <Link href="/dashboard" className="flex items-center pl-3 mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
            TwinMind
          </h1>
        </Link>

        <div className="space-y-1 mb-4">{renderLinks(routes)}</div>

        <div className="mb-2 px-3 pt-3 border-t border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Twin Intelligence</p>
          <div className="space-y-1">{renderLinks(insightRoutes)}</div>
        </div>

        <div className="mb-2 px-3 pt-3 border-t border-white/10">
          <div className="space-y-1">{renderLinks(settingsRoutes)}</div>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/10">
        <button
          onClick={onLogout}
          className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400"
        >
          <div className="flex items-center flex-1">
            <LogOut className="h-5 w-5 mr-3 text-red-500" />
            Logout
          </div>
        </button>
      </div>
    </div>
  );
}
