"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings, Lock, User, Loader2, Eye, EyeOff, Zap,
  CheckCircle, XCircle, RefreshCw, Link2, Clock,
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

type Tab = "security" | "integrations";

interface Integration {
  provider: string;
  createdAt: string;
  profileData?: string;
  expiresAt?: string;
}

const AVAILABLE_INTEGRATIONS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Import your posts and professional content to train your twin.",
    color: "bg-blue-600",
    textColor: "text-blue-600",
    borderColor: "border-blue-200",
    bgLight: "bg-blue-50",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect your Facebook profile and posts.",
    color: "bg-blue-800",
    textColor: "text-blue-800",
    borderColor: "border-blue-100",
    bgLight: "bg-blue-50",
    available: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Import your captions and stories to capture your voice.",
    color: "bg-pink-600",
    textColor: "text-pink-600",
    borderColor: "border-pink-200",
    bgLight: "bg-pink-50",
    available: false,
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Import your tweets to mirror your public persona.",
    color: "bg-slate-900",
    textColor: "text-slate-900",
    borderColor: "border-slate-200",
    bgLight: "bg-slate-50",
    available: false,
  },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "security"
  );
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [integrationMsg, setIntegrationMsg] = useState("");

  // Password form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Show success/error messages from OAuth callback query params
  useEffect(() => {
    const s = searchParams.get("success");
    const e = searchParams.get("error");
    if (s === "linkedin") setIntegrationMsg("LinkedIn connected successfully!");
    if (e === "linkedin_denied") setIntegrationMsg("LinkedIn connection was cancelled.");
    if (e === "linkedin_failed") setIntegrationMsg("LinkedIn connection failed. Please try again.");
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "integrations") fetchIntegrations();
  }, [activeTab]);

  const fetchIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const res = await axios.get("/api/integrations");
      setIntegrations(res.data.integrations);
    } catch {}
    finally { setLoadingIntegrations(false); }
  };

  const disconnect = async (provider: string) => {
    setDisconnecting(provider);
    try {
      await axios.post(`/api/integrations/${provider}/disconnect`);
      setIntegrations(prev => prev.filter(i => i.provider !== provider));
    } catch {}
    finally { setDisconnecting(null); }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match");
      setIsLoading(false);
      return;
    }
    try {
      await axios.post("/api/auth/change-password", { currentPassword, newPassword, confirmNewPassword });
      setSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = (provider: string) => integrations.some(i => i.provider === provider);
  const getProfile = (provider: string) => {
    const found = integrations.find(i => i.provider === provider);
    if (!found?.profileData) return null;
    try { return JSON.parse(found.profileData); } catch { return null; }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-3 mb-2">
        <Settings className="h-8 w-8 text-slate-700" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab("security")}
            className={cn(
              "flex items-center space-x-3 w-full p-3 rounded-lg border-l-4 font-medium transition",
              activeTab === "security"
                ? "bg-white shadow-sm border-violet-600"
                : "border-transparent hover:bg-slate-50"
            )}
          >
            <Lock className="h-5 w-5 text-violet-600" />
            <span>Security</span>
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={cn(
              "flex items-center space-x-3 w-full p-3 rounded-lg border-l-4 font-medium transition",
              activeTab === "integrations"
                ? "bg-white shadow-sm border-violet-600"
                : "border-transparent hover:bg-slate-50"
            )}
          >
            <Zap className="h-5 w-5 text-violet-600" />
            <span>Integrations</span>
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">

          {/* ---- Security Tab ---- */}
          {activeTab === "security" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center space-x-2 mb-6">
                <Lock className="h-5 w-5 text-slate-500" />
                <h2 className="text-xl font-semibold">Change Password</h2>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}
              <form onSubmit={onChangePassword} className="space-y-4">
                {[
                  { label: "Current Password", val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
                  { label: "New Password", val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(p => !p) },
                  { label: "Confirm New Password", val: confirmNewPassword, set: setConfirmNewPassword, show: showConfirm, toggle: () => setShowConfirm(p => !p) },
                ].map(field => (
                  <div key={field.label} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? "text" : "password"}
                        className="w-full p-2 border border-slate-200 rounded-md pr-10 focus:ring-2 focus:ring-violet-600 outline-none"
                        value={field.val}
                        onChange={e => field.set(e.target.value)}
                        required
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={field.toggle}>
                        {field.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-violet-600 text-white py-2 rounded-md hover:bg-violet-700 transition flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* ---- Integrations Tab ---- */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Social Media Integrations</h2>
                <p className="text-sm text-slate-500">
                  Connect your accounts to import your content and train your twin with your real online voice.
                </p>
              </div>

              {integrationMsg && (
                <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">{integrationMsg}</div>
              )}

              {loadingIntegrations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-3">
                  {AVAILABLE_INTEGRATIONS.map(integration => {
                    const connected = isConnected(integration.id);
                    const profile = getProfile(integration.id);
                    return (
                      <div
                        key={integration.id}
                        className={cn(
                          "p-5 bg-white rounded-xl border shadow-sm",
                          connected ? `border-l-4 ${integration.borderColor}` : "border-slate-100"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold", integration.color)}>
                              {integration.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{integration.name}</p>
                                {!integration.available && (
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                                    Coming Soon
                                  </span>
                                )}
                                {connected && (
                                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <CheckCircle className="h-2.5 w-2.5" /> Connected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{integration.description}</p>
                              {connected && profile?.name && (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {profile.name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {integration.available && !connected && (
                              <a
                                href={`/api/integrations/${integration.id}/connect`}
                                className={cn(
                                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition",
                                  integration.color,
                                  "hover:opacity-90"
                                )}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                Connect
                              </a>
                            )}
                            {connected && (
                              <>
                                <a
                                  href={`/api/integrations/${integration.id}/connect`}
                                  title="Re-sync"
                                  className="p-2 text-slate-400 hover:text-slate-600 transition"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() => disconnect(integration.id)}
                                  disabled={disconnecting === integration.id}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition disabled:opacity-50"
                                >
                                  {disconnecting === integration.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  Disconnect
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> More integrations coming soon
                </p>
                <p>Facebook, Instagram, and X (Twitter) integrations are in development. WhatsApp chat import is already available in the Upload section.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
