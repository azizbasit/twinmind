import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/token";

const publicRoutes = ["/", "/sign-in", "/sign-up", "/api/auth/(.*)"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes("(.*)")) {
      const regex = new RegExp(`^${route.replace("(.*)", ".*")}$`);
      return regex.test(pathname);
    }
    return pathname === route;
  });

  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  let isValidAccessToken = false;
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) isValidAccessToken = true;
  }

  if (isValidAccessToken && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isPublicRoute) return NextResponse.next();

  if (!isValidAccessToken && !refreshToken) {
    if (pathname === "/sign-in") return NextResponse.next();
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
