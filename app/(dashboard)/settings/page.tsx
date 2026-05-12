"use client";

import { useState } from "react";
import { Settings, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
      await axios.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-3 mb-8">
        <Settings className="h-8 w-8 text-slate-700" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Tabs (Mock for now) */}
        <div className="space-y-2">
          <button className="flex items-center space-x-3 w-full p-3 bg-white shadow-sm rounded-lg border-l-4 border-violet-600 font-medium">
            <User className="h-5 w-5 text-violet-600" />
            <span>Account Security</span>
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 mb-6">
              <Lock className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">
                {success}
              </div>
            )}

            <form onSubmit={onChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="w-full p-2 border border-slate-200 rounded-md pr-10 focus:ring-2 focus:ring-violet-600 outline-none"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    className="w-full p-2 border border-slate-200 rounded-md pr-10 focus:ring-2 focus:ring-violet-600 outline-none"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="w-full p-2 border border-slate-200 rounded-md pr-10 focus:ring-2 focus:ring-violet-600 outline-none"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

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

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Privacy Note</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              TwinMind takes your security seriously. Your password is encrypted before storage. 
              Changing your password will not affect your stored memories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
