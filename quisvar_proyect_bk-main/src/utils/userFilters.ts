import { Prisma, UserType } from '@prisma/client';

export const nonRemoteUserWhere = {
  userType: { not: UserType.REMOTO },
} satisfies Prisma.UsersWhereInput;

export const activeUserWhere = {
  status: true,
} satisfies Prisma.UsersWhereInput;

export const activeNonRemoteUserWhere = {
  ...activeUserWhere,
  ...nonRemoteUserWhere,
} satisfies Prisma.UsersWhereInput;

export const withNonRemoteUsers = (
  where: Prisma.UsersWhereInput = {}
): Prisma.UsersWhereInput => ({
  ...where,
  ...nonRemoteUserWhere,
});

export const withActiveUsers = (
  where: Prisma.UsersWhereInput = {}
): Prisma.UsersWhereInput => ({
  ...where,
  ...activeUserWhere,
});

export const withActiveNonRemoteUsers = (
  where: Prisma.UsersWhereInput = {}
): Prisma.UsersWhereInput => ({
  ...where,
  ...activeNonRemoteUserWhere,
});
