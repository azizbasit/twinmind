"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Brain, Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add a streaming placeholder for assistant
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, stream: true }),
      });

      if (!response.ok) throw new Error("Chat request failed");
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
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.content,
                  };
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
      console.error(error);
      setMessages(prev => prev.slice(0, -1)); // remove streaming placeholder on error
    } finally {
      setIsLoading(false);
    }
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
      if (data.text) {
        setInput(data.text);
      }
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsTranscribing(false);
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
              {message.role === "assistant" && (
                <Bot className="h-6 w-6 shrink-0 mt-0.5" />
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
                {message.streaming && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse rounded-sm" />
                )}
              </div>
              {message.role === "user" && <User className="h-6 w-6 shrink-0" />}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t">
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
                : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
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
            className="flex-1 bg-slate-100 dark:bg-slate-700 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
            placeholder={isTranscribing ? "Transcribing..." : "Talk to your digital twin..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || isTranscribing}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
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
