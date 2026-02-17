import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.$connect();

  const LIMITS = [
    { planType: 'BASIC', key: 'SERVICES_ACTIVE_MAX', valueInt: 5 },
    { planType: 'BASIC', key: 'LINKS_ACTIVE_MAX', valueInt: 1 },
    { planType: 'BASIC', key: 'BOOKINGS_PER_MONTH_MAX', valueInt: 200 },
    { planType: 'PRO', key: 'SERVICES_ACTIVE_MAX', valueInt: 25 },
    { planType: 'PRO', key: 'LINKS_ACTIVE_MAX', valueInt: 10 },
    { planType: 'PRO', key: 'BOOKINGS_PER_MONTH_MAX', valueInt: 1000 },
    { planType: 'BUSINESS', key: 'SERVICES_ACTIVE_MAX', valueInt: 100 },
    { planType: 'BUSINESS', key: 'LINKS_ACTIVE_MAX', valueInt: 50 },
    { planType: 'BUSINESS', key: 'BOOKINGS_PER_MONTH_MAX', valueInt: 5000 },
  ] as const;

  for (const row of LIMITS) {
    await prisma.planLimit.upsert({
      where: {
        planType_key: { planType: row.planType as any, key: row.key as any },
      },
      create: row as any,
      update: { valueInt: row.valueInt },
    });
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
