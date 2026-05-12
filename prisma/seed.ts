import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPermission = await prisma.permission.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  const userPermission = await prisma.permission.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user" },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      permissions: {
        connect: [{ id: adminPermission.id }, { id: userPermission.id }],
      },
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: {
      name: "USER",
      permissions: {
        connect: [{ id: userPermission.id }],
      },
    },
  });

  console.log("Roles and permissions seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
