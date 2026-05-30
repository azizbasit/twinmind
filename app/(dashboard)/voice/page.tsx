"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, Loader2, CheckCircle, AlertCircle, Zap,
  Trash2, Upload, Volume2, Square, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "journal" | "clone";
type JournalStatus = "idle" | "recording" | "transcribing" | "ingesting" | "done" | "error";
type CloneStatus = "none" | "cloning" | "ready" | "error";
type CloneRecordStatus = "idle" | "recording" | "uploading";

interface VoiceSample {
  id: string;
  fileName: string;
  filePath: string;
  createdAt: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VoicePage() {
  const [activeTab, setActiveTab] = useState<Tab>("journal");

  // Journal state
  const [journalStatus, setJournalStatus] = useState<JournalStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [memoriesExtracted, setMemoriesExtracted] = useState(0);
  const [journalError, setJournalError] = useState("");
  const journalMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const journalAudioChunksRef = useRef<Blob[]>([]);

  // Clone state
  const [cloneStatus, setCloneStatus] = useState<CloneStatus>("none");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [cloneRecordStatus, setCloneRecordStatus] = useState<CloneRecordStatus>("idle");
  const [speakText, setSpeakText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const cloneMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cloneAudioChunksRef = useRef<Blob[]>([]);
  const speakAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Load clone data when tab is active ──────────────────────────────────────

  const loadCloneData = useCallback(async () => {
    setSamplesLoading(true);
    try {
      const res = await fetch("/api/voice/samples");
      const data = await res.json();
      setSamples(data.samples ?? []);
      setVoiceId(data.voiceId ?? null);
      setCloneStatus((data.voiceCloneStatus as CloneStatus) ?? "none");
    } catch {
      setCloneError("Failed to load voice samples");
    } finally {
      setSamplesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "clone") loadCloneData();
  }, [activeTab, loadCloneData]);

  // ── Journal logic ────────────────────────────────────────────────────────────

  const startJournalRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      journalAudioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      journalMediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) journalAudioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await processJournalAudio();
      };
      mr.start();
      setJournalStatus("recording");
      setTranscript("");
      setMemoriesExtracted(0);
      setJournalError("");
    } catch {
      setJournalError("Microphone access denied. Please allow microphone permissions.");
      setJournalStatus("error");
    }
  };

  const stopJournalRecording = () => {
    journalMediaRecorderRef.current?.stop();
    setJournalStatus("transcribing");
  };

  const processJournalAudio = async () => {
    try {
      const audioBlob = new Blob(journalAudioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "journal.webm");
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      const transcribeData = await transcribeRes.json();
      if (!transcribeData.text) throw new Error("Transcription returned empty text");
      setTranscript(transcribeData.text);
      setJournalStatus("ingesting");
      const ingestRes = await fetch("/api/upload/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcribeData.text }),
      });
      const ingestData = await ingestRes.json();
      setMemoriesExtracted(ingestData.memoriesExtracted ?? 0);
      setJournalStatus("done");
    } catch (err: any) {
      setJournalError(err.message || "Processing failed");
      setJournalStatus("error");
    }
  };

  const resetJournal = () => {
    setJournalStatus("idle");
    setTranscript("");
    setMemoriesExtracted(0);
    setJournalError("");
  };

  // ── Clone – record sample from mic ──────────────────────────────────────────

  const startCloneRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cloneAudioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      cloneMediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) cloneAudioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setCloneRecordStatus("uploading");
        const blob = new Blob(cloneAudioChunksRef.current, { type: "audio/webm" });
        await uploadSampleBlob(blob, "recording.webm");
        setCloneRecordStatus("idle");
      };
      mr.start();
      setCloneRecordStatus("recording");
      setCloneError("");
    } catch {
      setCloneError("Microphone access denied.");
    }
  };

  const stopCloneRecording = () => {
    cloneMediaRecorderRef.current?.stop();
    setCloneRecordStatus("uploading");
  };

  // ── Clone – upload file ──────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingFile(true);
    setCloneError("");
    const formData = new FormData();
    formData.append("audio", file, file.name);
    const res = await fetch("/api/voice/samples", { method: "POST", body: formData });
    const data = await res.json();
    if (data.sample) setSamples(prev => [data.sample, ...prev]);
    else setCloneError(data.error || "Upload failed");
    setUploadingFile(false);
  };

  const uploadSampleBlob = async (blob: Blob, filename: string) => {
    const formData = new FormData();
    formData.append("audio", blob, filename);
    const res = await fetch("/api/voice/samples", { method: "POST", body: formData });
    const data = await res.json();
    if (data.sample) setSamples(prev => [data.sample, ...prev]);
    else setCloneError(data.error || "Upload failed");
  };

  const deleteSample = async (id: string) => {
    await fetch(`/api/voice/samples/${id}`, { method: "DELETE" });
    setSamples(prev => prev.filter(s => s.id !== id));
  };

  // ── Clone – create voice clone ───────────────────────────────────────────────

  const createVoiceClone = async () => {
    if (samples.length === 0) { setCloneError("Upload at least one voice sample first."); return; }
    setCloning(true);
    setCloneError("");
    setCloneStatus("cloning");
    try {
      const res = await fetch("/api/voice/clone", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice cloning failed");
      setVoiceId(data.voiceId);
      setCloneStatus("ready");
    } catch (err: any) {
      setCloneError(err.message || "Voice cloning failed");
      setCloneStatus("error");
    } finally {
      setCloning(false);
    }
  };

  // ── Clone – test voice ────────────────────────────────────────────────────────

  const testSpeak = async () => {
    if (!speakText.trim()) return;
    if (speaking) {
      speakAudioRef.current?.pause();
      speakAudioRef.current = null;
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    setCloneError("");
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: speakText }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      speakAudioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); speakAudioRef.current = null; };
      audio.play();
    } catch (err: any) {
      setCloneError(err.message || "Speech generation failed");
      setSpeaking(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-100 rounded-lg">
          <Mic className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Voice</h1>
          <p className="text-slate-500">Record your thoughts and clone your voice for your twin.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["journal", "clone"] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-medium transition",
              activeTab === tab ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === "journal" ? "Voice Journal" : "Voice Clone"}
          </button>
        ))}
      </div>

      {/* ── Journal Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "journal" && (
        <>
          <div className="flex flex-col items-center gap-6 py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={journalStatus === "recording" ? stopJournalRecording : startJournalRecording}
              disabled={journalStatus === "transcribing" || journalStatus === "ingesting"}
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center transition shadow-lg",
                journalStatus === "recording"
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : journalStatus === "transcribing" || journalStatus === "ingesting"
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700 text-white"
              )}
            >
              {journalStatus === "transcribing" || journalStatus === "ingesting" ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : journalStatus === "recording" ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </button>

            <div className="text-center">
              {journalStatus === "idle" && <p className="text-slate-500">Press to start recording</p>}
              {journalStatus === "recording" && <p className="text-red-500 font-medium animate-pulse">Recording... Press to stop</p>}
              {journalStatus === "transcribing" && <p className="text-violet-600 font-medium">Transcribing your voice...</p>}
              {journalStatus === "ingesting" && <p className="text-violet-600 font-medium">Extracting memories from your journal...</p>}
              {journalStatus === "done" && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Journal ingested successfully!</span>
                </div>
              )}
              {journalStatus === "error" && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{journalError}</span>
                </div>
              )}
            </div>
          </div>

          {(journalStatus === "done" || transcript) && (
            <div className="space-y-4">
              {memoriesExtracted > 0 && (
                <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <Zap className="h-5 w-5 text-violet-600 shrink-0" />
                  <p className="text-sm text-violet-700 font-medium">
                    {memoriesExtracted} new {memoriesExtracted === 1 ? "memory" : "memories"} extracted and saved to your twin.
                  </p>
                </div>
              )}
              {transcript && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold mb-3 text-slate-700">Transcript</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{transcript}</p>
                </div>
              )}
              {journalStatus === "done" && (
                <button onClick={resetJournal} className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition">
                  Record Another Journal
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-semibold text-slate-700 mb-1">What gets learned?</p>
              <p>Your personality, opinions, preferences, goals, and life events — all converted into memories your twin uses.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-semibold text-slate-700 mb-1">Privacy</p>
              <p>Voice is transcribed and immediately discarded. Only the text is stored as memories in your private account.</p>
            </div>
          </div>
        </>
      )}

      {/* ── Clone Tab ────────────────────────────────────────────────────────── */}
      {activeTab === "clone" && (
        <div className="space-y-6">
          {/* Status card */}
          <div className={cn(
            "p-5 rounded-2xl border flex items-center gap-4",
            cloneStatus === "ready" ? "bg-green-50 border-green-200" :
            cloneStatus === "cloning" ? "bg-yellow-50 border-yellow-200" :
            cloneStatus === "error" ? "bg-red-50 border-red-200" :
            "bg-slate-50 border-slate-200"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              cloneStatus === "ready" ? "bg-green-100" :
              cloneStatus === "cloning" ? "bg-yellow-100" :
              cloneStatus === "error" ? "bg-red-100" :
              "bg-slate-200"
            )}>
              {cloneStatus === "ready" ? <CheckCircle className="h-5 w-5 text-green-600" /> :
               cloneStatus === "cloning" ? <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" /> :
               cloneStatus === "error" ? <AlertCircle className="h-5 w-5 text-red-600" /> :
               <Mic className="h-5 w-5 text-slate-400" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                {cloneStatus === "ready" ? "Voice Clone Ready" :
                 cloneStatus === "cloning" ? "Creating voice clone..." :
                 cloneStatus === "error" ? "Clone Failed" :
                 "No voice clone yet"}
              </p>
              {voiceId && <p className="text-xs text-slate-500 truncate mt-0.5">ID: {voiceId}</p>}
              {cloneStatus === "none" && <p className="text-xs text-slate-500 mt-0.5">Upload samples below and click "Create Voice Clone"</p>}
            </div>
            <button onClick={loadCloneData} className="ml-auto text-slate-400 hover:text-slate-600 shrink-0">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Error */}
          {cloneError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {cloneError}
            </div>
          )}

          {/* Samples section */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Voice Samples</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add recordings of your natural speech. Aim for 1–3 minutes total.</p>
              </div>
              <div className="flex gap-2">
                {/* Upload file */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile || cloneRecordStatus !== "idle"}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload
                </button>
                {/* Record from mic */}
                <button
                  onClick={cloneRecordStatus === "recording" ? stopCloneRecording : startCloneRecording}
                  disabled={cloneRecordStatus === "uploading" || uploadingFile}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50",
                    cloneRecordStatus === "recording"
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-violet-600 hover:bg-violet-700 text-white"
                  )}
                >
                  {cloneRecordStatus === "uploading" ? <Loader2 className="h-4 w-4 animate-spin" /> :
                   cloneRecordStatus === "recording" ? <MicOff className="h-4 w-4" /> :
                   <Mic className="h-4 w-4" />}
                  {cloneRecordStatus === "recording" ? "Stop" : cloneRecordStatus === "uploading" ? "Saving..." : "Record"}
                </button>
              </div>
            </div>

            {samplesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
            ) : samples.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                No samples yet. Record or upload audio files above.
              </div>
            ) : (
              <ul className="space-y-2">
                {samples.map((s, i) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600 shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{s.fileName}</p>
                        <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSample(s.id)}
                      className="text-slate-300 hover:text-red-500 transition shrink-0 ml-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Create clone button */}
          <button
            onClick={createVoiceClone}
            disabled={cloning || samples.length === 0}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            {cloneStatus === "ready" ? "Recreate Voice Clone" : "Create Voice Clone"}
          </button>

          {/* Test voice */}
          {cloneStatus === "ready" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h2 className="font-semibold">Test Your Voice</h2>
              <p className="text-xs text-slate-500">Type anything and hear it spoken in your cloned voice.</p>
              <textarea
                rows={3}
                placeholder="Type something to hear your twin speak..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                value={speakText}
                onChange={e => setSpeakText(e.target.value)}
                disabled={speaking}
              />
              <button
                onClick={testSpeak}
                disabled={!speakText.trim() && !speaking}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition disabled:opacity-50",
                  speaking ? "bg-red-500 hover:bg-red-600 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"
                )}
              >
                {speaking ? <><Square className="h-4 w-4 fill-current" /> Stop</> : <><Volume2 className="h-4 w-4" /> Speak</>}
              </button>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">
            <p className="font-semibold text-slate-700 mb-1">Tips for better cloning</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Aim for 1–3 minutes of total audio across all samples</li>
              <li>Speak naturally in a quiet environment</li>
              <li>Include varied sentences — not just one repeated phrase</li>
              <li>Powered by <span className="font-medium text-slate-700">ElevenLabs</span></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
