import AppError from '@/utils/appError';
import type { TrainingLevel, TrainingSpecialist } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

type TrainingSpecialtyInput = {
  institution: string;
  hours: string;
  level: TrainingLevel;
  issue?: string | Date | null;
  startDate?: string | Date | null;
  untilDate?: string | Date | null;
  trainingFile?: string | null;
  TrainingSpecialistNameId: number;
};

class TrainingSpecialtyServices {
  static async createTrainingSpecialty(data: TrainingSpecialtyInput) {
    if (!data) throw new AppError(`Datos incorrectos`, 400);
    const newTraining = await prisma.trainingSpecialist.create({
      data: {
        ...data,
        TrainingSpecialistNameId: +data.TrainingSpecialistNameId,
        issue: data.issue ? new Date(data.issue) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        untilDate: data.untilDate ? new Date(data.untilDate) : null,
      },
    });
    return newTraining;
  }
  static async getTrainingSpecialty(
    TrainingSpecialistNameId: TrainingSpecialist['TrainingSpecialistNameId']
  ) {
    const training = await prisma.trainingSpecialist.findMany({
      where: { TrainingSpecialistNameId },
    });

    return training;
  }
  static async updateTrainingSpecialty(
    id: TrainingSpecialist['id'],
    { hours, institution, issue, level, startDate, trainingFile, untilDate }: TrainingSpecialtyInput
  ) {
    const training = await prisma.trainingSpecialist.update({
      where: { id },
      data: {
        id,
        institution,
        hours,
        level,
        issue: issue ? new Date(issue) : null,
        startDate: startDate ? new Date(startDate) : null,
        untilDate: untilDate ? new Date(untilDate) : null,
        trainingFile,
      },
    });

    return training;
  }
  static async deleteTrainingSpecialty(id: TrainingSpecialist['id']) {
    const training = await prisma.trainingSpecialist.delete({
      where: { id },
    });

    return training;
  }
}
export default TrainingSpecialtyServices;
