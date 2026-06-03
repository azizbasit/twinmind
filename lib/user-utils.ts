import { getCurrentUser } from "@/lib/auth/get-user";

export class AuthError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

export async function getOrCreateUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}
