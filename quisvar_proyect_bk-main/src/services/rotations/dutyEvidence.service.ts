import { unlink } from 'fs/promises';
import path from 'path';
import AppError from '@/utils/appError';
import { prisma } from '@/utils/prisma.server';
import { DUTY_EVIDENCE_ROOT } from '@/middlewares/dutyEvidence.middleware';

export interface UploadedDutyEvidence {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  absolutePath: string;
}

export const mapUploadedDutyEvidence = (
  files: Express.Multer.File[] = []
): UploadedDutyEvidence[] =>
  files.map(file => ({
    storageKey: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    absolutePath: file.path,
  }));

export const cleanupDutyEvidence = async (
  files: UploadedDutyEvidence[]
): Promise<void> => {
  await Promise.all(
    files.map(file => unlink(file.absolutePath).catch(() => undefined))
  );
};

class DutyEvidenceService {
  static async content(
    assignmentId: string,
    evidenceId: string,
    actorId: number,
    canAudit: boolean
  ) {
    const evidence = await prisma.dutyRotationAssignmentEvidence.findFirst({
      where: { id: evidenceId, assignmentId },
      include: {
        assignment: {
          select: {
            assignedUserId: true,
            executedByUserId: true,
          },
        },
      },
    });
    if (!evidence) throw new AppError('No se pudo encontrar la evidencia', 404);
    const canView =
      canAudit ||
      evidence.submittedById === actorId ||
      evidence.assignment.assignedUserId === actorId ||
      evidence.assignment.executedByUserId === actorId;
    if (!canView) {
      throw new AppError('No tiene acceso a esta evidencia', 403);
    }
    const absolutePath = path.resolve(DUTY_EVIDENCE_ROOT, evidence.storageKey);
    if (path.dirname(absolutePath) !== DUTY_EVIDENCE_ROOT) {
      throw new AppError('La evidencia tiene una ruta invalida', 409);
    }
    return {
      absolutePath,
      mimeType: evidence.mimeType,
      originalName: evidence.originalName,
    };
  }
}

export default DutyEvidenceService;
