import { unlinkSync } from 'fs';
import AppError from '@/utils/appError';
import type {
  Companies,
  Consortium,
  // ConsortiumOnCompanies,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import { URL_HOST } from '@/utils/tools';
type DataProps = {
  id: number;
  percentage: number;
};
class ConsortiumServices {
  static async create(data: Consortium) {
    if (!data) throw new AppError(`Oops!, algo salio mal`, 400);
    const consortiums = await prisma.consortium.create({ data });
    return consortiums;
  }
  static async getAllConsortium() {
    const consortiums = await prisma.consortium.findMany({
      select: {
        id: true,
        companies: true,
        name: true,
        manager: true,
        img: true,
      },
      orderBy: {
        name: 'desc',
      },
    });
    return consortiums;
  }
  static async getConsortiumById(id: Consortium['id']) {
    if (!id) throw new AppError(`Oops!, id no encontrado`, 400);
    const consortiums = await prisma.consortiumOnCompanies.findFirst({
      where: { consortiumId: id },
      select: {
        consortium: {
          select: {
            id: true,
            name: true,
            manager: true,
            img: true,
            companies: {
              select: {
                companies: {
                  select: {
                    id: true,
                    name: true,
                    img: true,
                  },
                },
                percentaje: true,
              },
              orderBy: {
                companies: {
                  name: 'asc',
                },
              },
            },
            contracts: {
              select: {
                id: true,
                projectId: true,
                projectName: true,
                projectShortName: true,
              },
            },
          },
        },
      },
    });
    return { ...consortiums?.consortium };
  }

  static async updatePercentaje(
    consortiumId: Consortium['id'],
    data: DataProps[]
  ) {
    if (!consortiumId) throw new AppError(`Oops!, id no encontrado`, 400);
    if (data.length === 0)
      throw new AppError(`Oops!, Al parecer no hay nada que actualizar`, 400);
    data.map(async ({ id, percentage }) => {
      return await prisma.consortiumOnCompanies.update({
        where: {
          consortiumId_companiesId: {
            consortiumId,
            companiesId: id,
          },
        },
        data: { percentaje: percentage },
      });
    });
    return 'Datos actualizados';
  }
  static async updateById(id: Consortium['id'], { name, manager }: Consortium) {
    if (!id) throw new AppError(`Oops!, id no encontrado`, 400);
    const consortiums = await prisma.consortium.update({
      where: { id },
      data: { name, manager },
    });
    return consortiums;
  }
  static async deleteById(id: Consortium['id']) {
    if (!id) throw new AppError(`Oops!, id no encontrado`, 400);
    const consortiums = await prisma.consortium.delete({
      where: { id },
    });
    return consortiums;
  }
  //CONSORTIUM IMG
  static async updateImg(img: Consortium['img'], id: Consortium['id']) {
    if (!img) throw new AppError(`Oops!, imagen no encontrada`, 400);
    const consortiums = await prisma.consortium.update({
      where: { id },
      data: { img },
    });
    return consortiums;
  }
  static async deleteImg(id: Consortium['id']) {
    if (!id) throw new AppError(`Oops!, id no encontrado`, 400);
    const res = await prisma.consortium.findUnique({
      where: { id },
      select: {
        img: true,
      },
    });
    if (res?.img) unlinkSync(`public/img/consortium/${res.img}`);
    const consortiums = await prisma.consortium.update({
      where: { id },
      data: {
        img: null,
      },
    });
    return consortiums;
  }
  //GET CONSORTIUM AND COMPANIES
  static async getBoth() {
    const companies = await prisma.companies.findMany({
      select: {
        id: true,
        name: true,
        img: true,
      },
    });
    const consortiums = await prisma.consortium.findMany({
      select: {
        id: true,
        name: true,
        img: true,
      },
    });

    const companiesWithProperty = companies.map(company => ({
      ...company,
      type: 'companyId',
      newId: 'companyId-' + company.id,
      urlImg: `${URL_HOST}/images/img/companies/${company.img}`,
    }));
    const consortiumsWithProperty = consortiums.map(consortium => ({
      ...consortium,
      type: 'consortiumId',
      newId: 'consortiumId-' + consortium.id,
      urlImg: `${URL_HOST}/images/img/consortium/${consortium.img}`,
    }));

    return [...consortiumsWithProperty, ...companiesWithProperty];
  }
  //CONSORTIUM RELATION
  static async createRelation(
    companiesId: Companies['id'],
    consortiumId: Consortium['id']
  ) {
    if (!companiesId || !consortiumId)
      throw new AppError(`Oops!, id no encontrado`, 400);
    const alreadyAdded = await prisma.consortiumOnCompanies.findFirst({
      where: {
        companiesId,
        consortiumId,
      },
    });
    if (alreadyAdded)
      throw new AppError(
        `Esta empresa ya se encuentra registrada en este consorcio`,
        400
      );
    const relation = await prisma.consortiumOnCompanies.create({
      data: {
        companiesId,
        consortiumId,
      },
    });
    return relation;
  }
  static async deleteRelation(
    companiesId: Companies['id'],
    consortiumId: Consortium['id']
  ) {
    if (!companiesId || !consortiumId)
      throw new AppError(`Oops!, id no encontrado`, 400);
    const relation = await prisma.consortiumOnCompanies.delete({
      where: {
        consortiumId_companiesId: {
          companiesId,
          consortiumId,
        },
      },
    });
    return relation;
  }
}
export default ConsortiumServices;
