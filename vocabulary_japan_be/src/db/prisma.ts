import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.ts';
import { PrismaClient } from '../generated/prisma/client.ts';

/**
 * Prisma 7 chạy query compiler (không còn query engine Rust), nên cần driver adapter:
 * @prisma/adapter-pg dùng gói `pg` để kết nối PostgreSQL.
 */
export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Một PrismaClient dùng chung cho cả app. */
export const prisma = createPrismaClient(env.DATABASE_URL);
