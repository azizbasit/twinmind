"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Brain, Calendar, Star, Tag } from "lucide-react";
import { format } from "date-fns";

interface Memory {
  id: string;
  content: string;
  type: string;
  importanceScore: number;
  createdAt: string;
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const response = await axios.get("/api/memory");
        setMemories(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMemories();
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
          <Brain className="h-6 w-6 text-pink-600 dark:text-pink-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Memory Bank</h1>
          <p className="text-slate-500">Insights extracted from your digital twin.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed">
          <p className="text-slate-500">No memories found yet. Start chatting to build your twin's mind.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((memory) => (
            <div key={memory.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    <Tag className="h-3 w-3" />
                    {memory.type}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs font-bold">{memory.importanceScore}/10</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                  {memory.content}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Calendar className="h-3 w-3" />
                {format(new Date(memory.createdAt), "PPP")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
