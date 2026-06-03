import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/token";

const PUBLIC_PAGES = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"];
const PUBLIC_API_PREFIX = "/api/auth/";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public pages and auth API routes
  if (PUBLIC_PAGES.includes(pathname) || pathname.startsWith(PUBLIC_API_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken  = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // Valid access token → pass through
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) return NextResponse.next();
  }

  // No valid access token — check if at least a refresh token exists
  if (refreshToken) {
    // Has refresh token: pass through.
    // - For page routes: dashboard layout will redirect to /sign-in (user re-logs in,
    //   or AuthProvider handles refresh on the next client-side API call).
    // - For API routes: API returns 401, AuthProvider intercepts, calls /api/auth/refresh,
    //   retries the request, user never notices.
    return NextResponse.next();
  }

  // Completely unauthenticated (no tokens at all)
  if (pathname.startsWith("/api/")) {
    // API routes get JSON 401 — not an HTML redirect
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Page routes → redirect to sign-in
  return NextResponse.redirect(new URL("/sign-in", req.url));
}

export { proxy as middleware };
export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
