import AppError from '@/utils/appError';
import type { Specialists } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';

class SpecialistServices {
  static async createSpecialist(data: Specialists) {
    if (!data) throw new AppError(`No hay datos`, 400);
    const newSpecialist = await prisma.specialists.create({ data });
    return newSpecialist;
  }
  static async getSpecialist() {
    const specialist = await prisma.specialists.findMany({
      orderBy: {
        lastName: 'asc',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        career: true,
        tuition: true,
        degree: true,
        dni: true,
        email: true,
        agreementFile: true,
        cvFile: true,
        inscription: true,
        inscriptionDate: true,
        phone: true,
      },
    });
    return specialist;
  }
  static async updateSpecialist(data: Specialists, id: Specialists['id']) {
    if (!data) throw new AppError(`No hay datos`, 400);
    const newSpecialist = await prisma.specialists.update({
      where: { id },
      data: {
        ...data,
        inscriptionDate: new Date(data.inscriptionDate),
      },
    });
    return newSpecialist;
  }
  static async getSpecialistByDNI(dni: Specialists['dni']) {
    const specialist = await prisma.specialists.findMany({
      where: {
        dni: {
          startsWith: dni,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        career: true,
        tuition: true,
        degree: true,
        dni: true,
        email: true,
        agreementFile: true,
        cvFile: true,
        inscription: true,
        inscriptionDate: true,
        phone: true,
      },
    });
    return specialist;
  }
  static async getSpecialistById(id: Specialists['id']) {
    const specialist = await prisma.specialists.findFirst({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        career: true,
        tuition: true,
        degree: true,
        dni: true,
        email: true,
        agreementFile: true,
        cvFile: true,
        inscription: true,
        inscriptionDate: true,
        phone: true,
      },
    });
    return specialist;
  }
  static async getSpecialistHistory(id: Specialists['id']) {
    return prisma.contractSpecialties.findMany({
      where: { specialistsId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        listSpecialties: { select: { name: true } },
        contratc: {
          select: {
            id: true,
            contractNumber: true,
            projectName: true,
            projectShortName: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });
  }
  static async deleteSpecialist(id: Specialists['id']) {
    if (!id) throw new AppError(`Ups, ocurrio un error`, 400);
    await prisma.specialists.delete({
      where: { id },
    });
    return 'deleted';
  }
}
export default SpecialistServices;
