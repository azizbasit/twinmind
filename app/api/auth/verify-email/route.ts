import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is missing" }, { status: 400 });
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    await db.$transaction([
      db.user.update({
        where: { id: verificationToken.userId },
        data: { isVerified: true },
      }),
      db.verificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    return NextResponse.redirect(new URL("/sign-in?verified=true", req.url));
  } catch (error) {
    console.error("[VERIFY_EMAIL_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
