import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { getUserByEmail } from "@/lib/auth/user";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await db.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (emailErr) {
      console.error("[FORGOT_PASSWORD_EMAIL_ERROR]", emailErr);
    }

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
