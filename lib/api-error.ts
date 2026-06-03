import { NextResponse } from "next/server";
import { AuthError } from "@/lib/user-utils";

export function handleApiError(error: unknown, label = "API"): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.error(`[${label}]`, error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
