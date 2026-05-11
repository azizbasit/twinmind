"use client";

import { useState } from "react";
import axios from "axios";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  };

  const onUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus("idle");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/upload", formData);
      setStatus("success");
      setMessage(response.data.message);
      setFile(null);
    } catch (error) {
      setStatus("error");
      setMessage("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
          <Upload className="h-6 w-6 text-orange-600 dark:text-orange-300" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Ingest Knowledge</h1>
          <p className="text-slate-500">Upload documents to help your twin learn faster.</p>
        </div>
      </div>

      <div 
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition",
          file ? "border-violet-500 bg-violet-50 dark:bg-violet-900/10" : "border-slate-200 dark:border-slate-700"
        )}
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          accept=".txt,.md,.pdf" 
          onChange={onFileChange}
          disabled={isUploading}
        />
        <label 
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-4"
        >
          {file ? (
            <FileText className="h-16 w-16 text-violet-500" />
          ) : (
            <Upload className="h-16 w-16 text-slate-300" />
          )}
          <div>
            <p className="text-lg font-medium">
              {file ? file.name : "Click to select a file"}
            </p>
            <p className="text-sm text-slate-500">
              Supports .txt, .md (PDF coming soon)
            </p>
          </div>
        </label>

        {file && !isUploading && (
          <button
            onClick={onUpload}
            className="mt-8 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition"
          >
            Start Ingestion
          </button>
        )}

        {isUploading && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            <p className="text-sm font-medium">Analyzing document and extracting memories...</p>
          </div>
        )}

        {status === "success" && (
          <div className="mt-8 flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-8 flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <h3 className="font-bold mb-2">What happens after upload?</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Our AI analyzes the content, extracts meaningful insights, and converts them into embeddings. 
            These memories are then stored in your twin's long-term memory.
          </p>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
          <h3 className="font-bold mb-2">Privacy first</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your data is only used to build your personal digital twin. 
            It is never shared with third parties or used to train global models.
          </p>
        </div>
      </div>
    </div>
  );
}
