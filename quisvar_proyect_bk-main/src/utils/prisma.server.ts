/* eslint-disable no-var */
import { PrismaClient } from '@prisma/client';
import mealOrderOnUserExtensions from '@/extensions/mealOrderOnUserExtensions';
import pc from 'picocolors';

const createPrismaClient = () =>
  new PrismaClient().$extends(mealOrderOnUserExtensions);

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

let prisma: ExtendedPrismaClient;
declare global {
  var db: ExtendedPrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
  prisma.$connect();
  console.log('Database is under Production');
} else {
  if (!global.db) {
    console.log(pc.bgWhite(pc.bold('🚧 Database is under development 🚧 ')));
    global.db = createPrismaClient();
    global.db.$connect();
  }
  prisma = global.db;
}

export * from '@prisma/client';
export { prisma };
