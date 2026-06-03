"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

// Intercepts both window.fetch and axios globally.
// On 401: tries /api/auth/refresh once (deduplicated), retries the original request.
// If refresh also fails → redirects to /sign-in.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;
    let refreshing: Promise<boolean> | null = null;

    const doRefresh = () => {
      if (!refreshing) {
        refreshing = originalFetch("/api/auth/refresh", { method: "POST" })
          .then(r => r.ok)
          .catch(() => false)
          .finally(() => { refreshing = null; });
      }
      return refreshing;
    };

    // ── fetch interceptor ─────────────────────────────────────────────────
    window.fetch = async (input, init) => {
      const res = await originalFetch(input, init);
      if (res.status !== 401) return res;

      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("/api/auth/")) return res;

      const refreshed = await doRefresh();
      if (refreshed) return originalFetch(input, init);
      router.push("/sign-in");
      return res;
    };

    // ── axios interceptor ─────────────────────────────────────────────────
    const axiosId = axios.interceptors.response.use(
      res => res,
      async error => {
        const status = error?.response?.status;
        const url: string = error?.config?.url ?? "";
        if (status !== 401 || url.includes("/api/auth/")) throw error;

        const refreshed = await doRefresh();
        if (refreshed) return axios.request(error.config);
        router.push("/sign-in");
        throw error;
      }
    );

    return () => {
      window.fetch = originalFetch;
      axios.interceptors.response.eject(axiosId);
    };
  }, [router]);

  return <>{children}</>;
}
