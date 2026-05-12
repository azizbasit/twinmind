import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log("USERS:", JSON.stringify(users.map(u => ({ email: u.email, isVerified: u.isVerified })), null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
