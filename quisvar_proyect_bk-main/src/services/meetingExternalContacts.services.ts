import { UserType } from '@/middlewares/auth.middleware';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import MeetingPermissionService from '@/services/meetingPermission.services';

type ContactInput = {
  name?: string;
  position?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  notes?: string | null;
};

class MeetingExternalContactsServices {
  public static async list(userInfo: UserType, search?: string) {
    MeetingPermissionService.assertModuleRole(userInfo, [
      'MOD',
      'MEMBER',
      'USER',
      'VIEWER',
    ]);
    const cleanSearch = search?.trim();
    return prisma.meetingExternalContact.findMany({
      where: {
        isActive: true,
        ...(cleanSearch
          ? {
              OR: [
                { name: { contains: cleanSearch, mode: 'insensitive' } },
                { position: { contains: cleanSearch, mode: 'insensitive' } },
                {
                  organization: { contains: cleanSearch, mode: 'insensitive' },
                },
                { email: { contains: cleanSearch, mode: 'insensitive' } },
                { document: { contains: cleanSearch, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
      take: 25,
    });
  }

  public static async create(userInfo: UserType, data: ContactInput) {
    MeetingPermissionService.assertModuleRole(userInfo, [
      'MOD',
      'MEMBER',
      'USER',
    ]);
    if (!data.name?.trim())
      throw new AppError('Ingrese nombre del contacto', 400);
    return prisma.meetingExternalContact.create({
      data: {
        name: data.name.trim(),
        position: data.position?.trim() || null,
        organization: data.organization?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        document: data.document?.trim() || null,
        notes: data.notes?.trim() || null,
        createdById: userInfo.id,
      },
    });
  }
}

export default MeetingExternalContactsServices;
