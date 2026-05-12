import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { getUserByEmail, getDefaultRole } from "@/lib/auth/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(validatedData.password);
    const defaultRole = await getDefaultRole();

    if (!defaultRole) {
      return NextResponse.json(
        { error: "Default role not found. Please run seed script." },
        { status: 500 }
      );
    }

    const user = await db.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        roleId: defaultRole.id,
        isVerified: true, // Default to true for development
      },
    });

    // Generate verification token (mock for now)
    const verificationToken = Math.random().toString(36).substring(2, 15);
    await db.verificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // TODO: Send verification email

    return NextResponse.json(
      { message: "User registered successfully. Please verify your email." },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
