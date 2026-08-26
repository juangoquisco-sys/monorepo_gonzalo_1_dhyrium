import { prisma } from '@/utils/prisma.server';

class verificationUsersServices {
  static async saveToken(token: string, userId: number) {
    const verificationUser = prisma.verificationUser.upsert({
      where: { userId },
      update: {
        token,
      },
      create: {
        token,
        userId,
      },
    });
    return verificationUser;
  }
  static async expireToken(userId: number) {
    const verificationUser = prisma.verificationUser.update({
      where: { userId },
      data: {
        token: 'expired',
      },
    });
    return verificationUser;
  }
}
export default verificationUsersServices;
