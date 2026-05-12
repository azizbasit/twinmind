import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (refreshToken) {
    await db.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear cookies
  response.cookies.set("access_token", "", { maxAge: 0 });
  response.cookies.set("refresh_token", "", { maxAge: 0 });

  return response;
}
