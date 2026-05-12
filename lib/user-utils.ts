import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function getOrCreateUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // With custom auth, the user is already in the DB and verified.
  // We just return the user object we got from getCurrentUser.
  return user;
}
