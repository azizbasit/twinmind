import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function getOrCreateUser() {
  const { userId: clerkId } = await auth();
  const user = await currentUser();

  if (!clerkId || !user) {
    throw new Error("Unauthorized");
  }

  let dbUser = await db.user.findUnique({
    where: { clerkId },
  });

  if (!dbUser) {
    dbUser = await db.user.create({
      data: {
        clerkId,
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  }

  return dbUser;
}
