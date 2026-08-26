import AppError from '@/utils/appError';
import type { TrainingSpecialistNameList } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

class TrainingSpecialtyListServices {
  static async createTrainingSpecialtyList(data: TrainingSpecialistNameList) {
    if (!data) throw new AppError(`Datos incorrectos`, 400);
    const newTraining = await prisma.trainingSpecialistNameList.create({
      data,
    });
    return newTraining;
  }
  static async getTrainingSpecialtyList(
    specialistId: TrainingSpecialistNameList['specialistId']
  ) {
    const training = await prisma.trainingSpecialistNameList.findMany({
      where: { specialistId },
      select: {
        id: true,
        trainingName: true,
        trainingSpecialistName: true,
      },
    });
    return training;
  }
  static async updateTrainingSpecialtyList(
    id: TrainingSpecialistNameList['id'],
    { trainingName }: TrainingSpecialistNameList
  ) {
    if (!trainingName) throw new AppError(`Datos incorrectos`, 400);
    const newTraining = await prisma.trainingSpecialistNameList.update({
      where: { id },
      data: { trainingName },
    });
    return newTraining;
  }
  static async deleteTrainingSpecialtyList(
    id: TrainingSpecialistNameList['id']
  ) {
    if (!id) throw new AppError(`Datos incorrectos`, 400);
    const newTraining = await prisma.trainingSpecialistNameList.delete({
      where: { id },
    });
    return newTraining;
  }
}
export default TrainingSpecialtyListServices;
