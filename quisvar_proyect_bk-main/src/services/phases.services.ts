import { Phases } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import ReportsServices from '@/services/reports.services';

class PhasesServices {
  public static ZONE_LOCALE: string = 'es-PE';
  public static CONFIG_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };

  public static async getAll({ currentYear }: { currentYear?: string }) {
    const date = currentYear ? new Date(currentYear) : new Date();

    const { endOfYear, startOfYear } = ReportsServices.getRangeDate(date);
    const phases = await prisma.phases.findMany({
      where: { initialDate: { gte: startOfYear, lte: endOfYear } },
    });
    return phases;
  }
  public static async create({
    initialDate,
    untilDate,
  }: Pick<Phases, 'initialDate' | 'untilDate'>) {
    if (!(initialDate instanceof Date))
      throw new AppError('Fecha inicial invalida', 400);
    if (!(untilDate instanceof Date))
      throw new AppError('Fecha final invalida', 400);
    const name = `${this.parseDate(initialDate)} - ${this.parseDate(
      untilDate
    )}`;
    const newPhase = await prisma.phases.create({
      data: { initialDate, untilDate, name },
    });
    return newPhase;
  }

  public static async update(
    id: Phases['id'],
    { initialDate, untilDate }: Pick<Phases, 'initialDate' | 'untilDate'>
  ) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    if (!(initialDate instanceof Date))
      throw new AppError('Fecha inicial invalida', 400);
    if (!(untilDate instanceof Date))
      throw new AppError('Fecha final invalida', 400);
    const name = `${this.parseDate(initialDate)} - ${this.parseDate(
      untilDate
    )}`;
    // const getReports = await prisma.phases.findUnique({
    //   where: { id },
    //   select: { reports: true },
    // });
    // if (!getReports?.reports.length)
    //   throw new AppError('No se puede editar esta fase', 400);
    const updatePhase = await prisma.phases.update({
      where: { id },
      data: { name, initialDate, untilDate },
    });
    return updatePhase;
  }

  public static async remove(id: Phases['id']) {
    if (!id) throw new AppError('Oops!, ID invalido', 400);
    // const getReports = await prisma.phases.findUnique({
    //   where: { id },
    //   select: { reports: true },
    // });
    // if (!getReports?.reports.length)
    //   throw new AppError('No se puede eliminar esta fase', 400);
    const deletePhase = await prisma.phases.delete({ where: { id } });
    return deletePhase;
  }

  public static parseDate(date: Date, config?: Intl.DateTimeFormatOptions) {
    const formato = new Intl.DateTimeFormat(this.ZONE_LOCALE, {
      ...config,
      ...this.CONFIG_DATE_TIME_FORMAT,
    }).format;
    return formato(date);
  }
}
export default PhasesServices;
