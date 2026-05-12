import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyAll() {
  const result = await prisma.user.updateMany({
    where: { isVerified: false },
    data: { isVerified: true }
  });
  
  console.log(`Verified ${result.count} users.`);
}

verifyAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
