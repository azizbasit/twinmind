"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/chat", {
        message: input,
        conversationId,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.content,
      };

      setMessages((current) => [...current, assistantMessage]);
      setConversationId(response.data.conversationId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
              <Brain className="h-12 w-12 text-violet-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Welcome to TwinMind</h2>
              <p className="text-slate-500 max-w-sm">
                I am your digital twin. I learn from your inputs and reflect your personality.
              </p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex w-full",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl p-4 flex gap-3 shadow-sm",
                message.role === "user" 
                  ? "bg-violet-600 text-white" 
                  : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              )}
            >
              {message.role === "assistant" && <Bot className="h-6 w-6 shrink-0" />}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
              {message.role === "user" && <User className="h-6 w-6 shrink-0" />}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex gap-3 shadow-sm animate-pulse">
              <Bot className="h-6 w-6 text-slate-400" />
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded self-center" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t">
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto flex gap-2">
          <input
            className="flex-1 bg-slate-100 dark:bg-slate-700 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
            placeholder="Talk to your digital twin..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input}
            className="p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          TwinMind learns from every interaction to better represent you.
        </p>
      </div>
    </div>
  );
}
