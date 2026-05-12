import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/token";

const publicRoutes = ["/", "/sign-in", "/sign-up", "/api/auth/(.*)"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes("(.*)")) {
      const regex = new RegExp(`^${route.replace("(.*)", ".*")}$`);
      return regex.test(pathname);
    }
    return pathname === route;
  });

  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // Verify access token if it exists
  let isValidAccessToken = false;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      isValidAccessToken = true;
    }
  }

  // If the user is logged in (has valid access token) and trying to access sign-in/sign-up, redirect to dashboard
  if (isValidAccessToken && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If no valid access token and no refresh token, redirect to sign-in
  if (!isValidAccessToken && !refreshToken) {
    // Avoid redirect loop if already on sign-in
    if (pathname === "/sign-in") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // If we have a refresh token but no valid access token, we allow the request to proceed.
  // The client-side or server-side layout will handle the refresh if needed.
  // This prevents the redirect loop because we don't redirect back to /dashboard from /sign-in
  // unless we have a VALID access token.
  if (!isValidAccessToken && refreshToken) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Export as both named 'middleware' (for Next.js convention) and 'proxy' (for the new convention)
export { proxy as middleware };
export default proxy;

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
