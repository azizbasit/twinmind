"use client";

import { useState } from "react";
import axios from "axios";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, MessageCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "document" | "whatsapp";
type UploadStatus = "idle" | "success" | "error";

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>("document");

  // Document upload state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docStatus, setDocStatus] = useState<UploadStatus>("idle");
  const [docMessage, setDocMessage] = useState("");
  const [docUploading, setDocUploading] = useState(false);

  // WhatsApp upload state
  const [waFile, setWaFile] = useState<File | null>(null);
  const [waStatus, setWaStatus] = useState<UploadStatus>("idle");
  const [waMessage, setWaMessage] = useState("");
  const [waUploading, setWaUploading] = useState(false);
  const [waSenders, setWaSenders] = useState<string[]>([]);
  const [waSelectedSender, setWaSelectedSender] = useState("");
  const [waNeedsSender, setWaNeedsSender] = useState(false);

  // --- Document upload ---
  const onDocUpload = async () => {
    if (!docFile) return;
    setDocUploading(true);
    setDocStatus("idle");
    const formData = new FormData();
    formData.append("file", docFile);
    try {
      const res = await axios.post("/api/upload", formData);
      if (res.data.success) {
        setDocStatus("success");
        setDocMessage(res.data.message);
        setDocFile(null);
      } else {
        setDocStatus("error");
        setDocMessage(res.data.error || "Upload failed");
      }
    } catch (err: any) {
      setDocStatus("error");
      setDocMessage(err.response?.data?.error || "Upload failed");
    } finally {
      setDocUploading(false);
    }
  };

  // --- WhatsApp upload: step 1 detect senders ---
  const onWaFileSelect = async (file: File) => {
    setWaFile(file);
    setWaStatus("idle");
    setWaNeedsSender(false);
    setWaSenders([]);
    setWaSelectedSender("");
    setWaMessage("");

    setWaUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post("/api/upload/whatsapp", formData);
      if (res.data.needsSender) {
        setWaSenders(res.data.senders);
        setWaNeedsSender(true);
      } else {
        setWaStatus("error");
        setWaMessage(res.data.error || "Could not parse file");
      }
    } catch (err: any) {
      setWaStatus("error");
      setWaMessage(err.response?.data?.error || "Could not parse file");
    } finally {
      setWaUploading(false);
    }
  };

  // --- WhatsApp upload: step 2 ingest with sender ---
  const onWaIngest = async () => {
    if (!waFile || !waSelectedSender) return;
    setWaUploading(true);
    setWaStatus("idle");
    const formData = new FormData();
    formData.append("file", waFile);
    formData.append("userName", waSelectedSender);
    try {
      const res = await axios.post("/api/upload/whatsapp", formData);
      if (res.data.success) {
        setWaStatus("success");
        setWaMessage(
          `Processed ${res.data.yourMessages} of your messages (out of ${res.data.totalMessages} total). Extracted ${res.data.memoriesExtracted} memories.`
        );
        setWaFile(null);
        setWaNeedsSender(false);
        setWaSenders([]);
      } else {
        setWaStatus("error");
        setWaMessage(res.data.error || "Ingestion failed");
      }
    } catch (err: any) {
      setWaStatus("error");
      setWaMessage(err.response?.data?.error || "Ingestion failed");
    } finally {
      setWaUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Upload className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Ingest Knowledge</h1>
          <p className="text-slate-500">Upload documents or chat exports to train your twin.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("document")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition",
            tab === "document"
              ? "bg-violet-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <FileText className="h-4 w-4" />
          Documents
        </button>
        <button
          onClick={() => setTab("whatsapp")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition",
            tab === "whatsapp"
              ? "bg-green-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Chat
        </button>
      </div>

      {/* Document Tab */}
      {tab === "document" && (
        <div>
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition",
              docFile ? "border-violet-500 bg-violet-50" : "border-slate-200"
            )}
          >
            <input
              type="file"
              id="doc-upload"
              className="hidden"
              accept=".txt,.md,.pdf"
              onChange={e => e.target.files?.[0] && setDocFile(e.target.files[0])}
              disabled={docUploading}
            />
            <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-4">
              {docFile ? (
                <FileText className="h-16 w-16 text-violet-500" />
              ) : (
                <Upload className="h-16 w-16 text-slate-300" />
              )}
              <div>
                <p className="text-lg font-medium">{docFile ? docFile.name : "Click to select a file"}</p>
                <p className="text-sm text-slate-500">Supports .txt, .md, .pdf</p>
              </div>
            </label>
            {docFile && !docUploading && (
              <button
                onClick={onDocUpload}
                className="mt-8 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition"
              >
                Start Ingestion
              </button>
            )}
            {docUploading && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                <p className="text-sm font-medium">Analyzing document and extracting memories...</p>
              </div>
            )}
            {docStatus === "success" && (
              <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{docMessage}</p>
              </div>
            )}
            {docStatus === "error" && (
              <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{docMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Tab */}
      {tab === "whatsapp" && (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            <p className="font-semibold mb-1">How to export your WhatsApp chat:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open any WhatsApp chat</li>
              <li>Tap ⋮ (menu) → More → Export chat</li>
              <li>Choose "Without media"</li>
              <li>Upload the .txt file here</li>
            </ol>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition",
              waFile && !waNeedsSender ? "border-green-500 bg-green-50" : "border-slate-200"
            )}
          >
            <input
              type="file"
              id="wa-upload"
              className="hidden"
              accept=".txt"
              onChange={e => e.target.files?.[0] && onWaFileSelect(e.target.files[0])}
              disabled={waUploading}
            />
            {!waFile && !waUploading && (
              <label htmlFor="wa-upload" className="cursor-pointer flex flex-col items-center gap-4">
                <MessageCircle className="h-16 w-16 text-slate-300" />
                <div>
                  <p className="text-lg font-medium">Click to select WhatsApp export file</p>
                  <p className="text-sm text-slate-500">Only .txt files</p>
                </div>
              </label>
            )}
            {waUploading && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                <p className="text-sm font-medium">
                  {waNeedsSender ? "Extracting memories..." : "Parsing chat file..."}
                </p>
              </div>
            )}
          </div>

          {/* Sender selection */}
          {waNeedsSender && !waUploading && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="font-semibold">Who are you in this chat?</h3>
              <p className="text-sm text-slate-500">
                Select your name so we only learn from your messages, not others.
              </p>
              <div className="space-y-2">
                {waSenders.map(sender => (
                  <button
                    key={sender}
                    onClick={() => setWaSelectedSender(sender)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg border transition",
                      waSelectedSender === sender
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className="font-medium">{sender}</span>
                    {waSelectedSender === sender && <CheckCircle className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              {waSelectedSender && (
                <button
                  onClick={onWaIngest}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition"
                >
                  Extract Memories as {waSelectedSender}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {waStatus === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{waMessage}</p>
            </div>
          )}
          {waStatus === "error" && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{waMessage}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="font-bold mb-2">What gets learned?</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Our AI analyzes content, extracts meaningful insights, and converts them into your twin's long-term memories.
          </p>
        </div>
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="font-bold mb-2">Privacy first</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your data is only used to build your personal digital twin and is never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}
