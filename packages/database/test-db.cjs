const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_6vCa0oXJYhub@ep-long-snow-ayr7nvsw-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require',
    },
  },
});

async function main() {
  console.log('Testing Neon DB...');
  const res = await prisma.$queryRaw`SELECT 1 as result`;
  console.log('Raw query result:', res);
  const salonCount = await prisma.salon.count();
  console.log('Salon count:', salonCount);
  const userCount = await prisma.user.count();
  console.log('User count:', userCount);
}

main()
  .catch((err) => console.error('FAILED:', err))
  .finally(() => prisma.$disconnect());
