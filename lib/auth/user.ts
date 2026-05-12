import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export async function getUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    include: { role: true },
  });
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    include: { role: true },
  });
}

export async function getDefaultRole(): Promise<Role | null> {
  return db.role.findUnique({
    where: { name: "USER" },
  });
}
