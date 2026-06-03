"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Intercepts fetch globally.
// On 401: tries /api/auth/refresh once, retries the original request.
// If refresh also fails → redirects to /sign-in.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;
    let refreshing: Promise<boolean> | null = null;

    window.fetch = async (input, init) => {
      const res = await originalFetch(input, init);

      if (res.status !== 401) return res;

      // Don't intercept auth endpoints themselves
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("/api/auth/")) return res;

      // Try refresh exactly once (deduplicate parallel calls)
      if (!refreshing) {
        refreshing = originalFetch("/api/auth/refresh", { method: "POST" })
          .then(r => r.ok)
          .catch(() => false)
          .finally(() => { refreshing = null; });
      }

      const refreshed = await refreshing;

      if (refreshed) {
        // Retry the original request with the new cookie
        return originalFetch(input, init);
      }

      // Refresh failed — session truly expired, go to sign-in
      router.push("/sign-in");
      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  return <>{children}</>;
}
