import type { Prisma } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

export const gateUserSelect = {
  id: true,
  email: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      dni: true,
      phone: true,
    },
  },
} satisfies Prisma.UsersSelect;

export const gateEvidenceInclude = {
  submittedBy: { select: gateUserSelect },
} satisfies Prisma.GateEvidenceInclude;

export const gateReviewRequestInclude = {
  requestedBy: { select: gateUserSelect },
  reviewedBy: { select: gateUserSelect },
  evidences: {
    include: gateEvidenceInclude,
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.GateReviewRequestInclude;

export const gatePassInclude = {
  user: { select: gateUserSelect },
  createdBy: { select: gateUserSelect },
  departureMarkedBy: { select: gateUserSelect },
  returnMarkedBy: { select: gateUserSelect },
  reviewRequests: {
    include: gateReviewRequestInclude,
    orderBy: { createdAt: 'desc' },
  },
  evidences: {
    include: gateEvidenceInclude,
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.GatePassInclude;

export class GateControlRepository {
  static db = prisma;

  static async findPass(id: string, tx: typeof prisma = prisma) {
    return tx.gatePass.findUnique({
      where: { id },
      include: gatePassInclude,
    });
  }
}
