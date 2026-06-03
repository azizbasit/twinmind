"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Brain, Mic, MicOff, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Starter {
  id: string;
  text: string;
  emoji: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [starters, setStarters] = useState<Starter[]>([]);
  const [startersLoading, setStartersLoading] = useState(true);
  const [usedStarterIds, setUsedStarterIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetchStarters();
  }, []);

  const fetchStarters = async (exclude: string[] = []) => {
    setStartersLoading(true);
    try {
      const params = exclude.length ? `?exclude=${exclude.join(",")}` : "";
      const res = await fetch(`/api/chat/starters${params}`);
      const data = await res.json();
      setStarters(data.starters ?? []);
    } catch {
      setStarters([]);
    } finally {
      setStartersLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, stream: true }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        throw new Error(`Chat request failed (${response.status}): ${errText}`);
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "meta") {
              setConversationId(event.conversationId);
            } else if (event.type === "delta") {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + event.content };
                }
                return updated;
              });
            } else if (event.type === "done") {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, streaming: false };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("[CHAT_ERROR]", error);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const pickStarter = (starter: Starter) => {
    const newUsed = [...usedStarterIds, starter.id];
    setUsedStarterIds(newUsed);
    // Send the starter text as a user message directly
    sendMessage(starter.text);
  };

  const refreshStarters = () => {
    fetchStarters(usedStarterIds);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) setInput(data.text);
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Empty state with conversation starters */}
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center space-y-8 py-8">
            {/* Welcome */}
            <div className="text-center space-y-3">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm inline-block">
                <Brain className="h-10 w-10 text-violet-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Let's talk
                </h2>
                <p className="text-slate-500 text-sm max-w-xs">
                  I learn how you think, decide, and communicate through conversation — pick a topic or start your own.
                </p>
              </div>
            </div>

            {/* Conversation starters */}
            <div className="w-full max-w-2xl space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Start a conversation
                </p>
                <button
                  onClick={refreshStarters}
                  disabled={startersLoading}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 transition"
                >
                  <RefreshCw className={cn("h-3 w-3", startersLoading && "animate-spin")} />
                  More
                </button>
              </div>

              {startersLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {starters.map(starter => (
                    <button
                      key={starter.id}
                      onClick={() => pickStarter(starter)}
                      disabled={isLoading}
                      className="group text-left bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-slate-700 transition disabled:opacity-50 shadow-sm"
                    >
                      <span className="text-xl mb-2 block">{starter.emoji}</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-3 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition">
                        {starter.text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn("flex w-full", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl p-4 flex gap-3 shadow-sm",
                message.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              )}
            >
              {message.role === "assistant" && <Bot className="h-6 w-6 shrink-0 mt-0.5 text-violet-500" />}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
                {message.streaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse rounded-sm" />
                )}
              </div>
              {message.role === "user" && <User className="h-6 w-6 shrink-0 text-violet-200" />}
            </div>
          </div>
        ))}

        <div ref={scrollRef} />
      </div>

      {/* Input bar */}
      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto flex gap-2">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing || isLoading}
            title={isRecording ? "Stop recording" : "Record voice message"}
            className={cn(
              "p-3 rounded-xl transition disabled:opacity-50",
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
            )}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>
          <input
            className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
            placeholder={isTranscribing ? "Transcribing…" : "Say anything — or pick a topic above…"}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading || isTranscribing}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          TwinMind learns how you think and communicate through every conversation.
        </p>
      </div>
    </div>
  );
}
