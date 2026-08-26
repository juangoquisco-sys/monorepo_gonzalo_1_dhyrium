import AppError from '@/utils/appError';
import type { ListSpecialties } from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
class ListSpecialtiesServices {
  static async create(name: ListSpecialties['name']) {
    if (!name) throw new AppError(`Oops!, algo salio mal`, 400);
    const find = await prisma.listSpecialties.findUnique({
      where: { name },
    });
    if (find)
      throw new AppError(`Ya existe una especialidad con ese nombre`, 409);
    const duty = await prisma.listSpecialties.create({
      data: { name },
    });
    return duty;
  }
  static async getAll() {
    const items = await prisma.listSpecialties.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    const duty = items.map(item => {
      return {
        id: item.id,
        value: item.id.toString(),
        label: item.name,
      };
    });
    return duty;
  }
  static async update(
    id: ListSpecialties['id'],
    name: ListSpecialties['name']
  ) {
    if (!name || !id) throw new AppError(`Oops!, algo salio mal`, 400);
    const duty = await prisma.listSpecialties.update({
      where: { id },
      data: { name },
    });
    return duty;
  }
  static async delete(id: ListSpecialties['id']) {
    if (!id) throw new AppError(`Oops!, algo salio mal`, 400);
    await prisma.listSpecialties.delete({
      where: { id },
    });
    return { message: 'Deleted' };
  }
}
export default ListSpecialtiesServices;
