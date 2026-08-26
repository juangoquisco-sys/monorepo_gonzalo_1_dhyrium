import { ContractForm } from '@/types/types';
import type {
  Companies,
  Consortium,
  ContractSpecialties,
  Contratc,
  ListSpecialties,
  Specialists,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import { existsSync, mkdirSync, rmdirSync } from 'fs';
import { _contractPath } from '@/services/paths.services';
import Queries from '@/utils/queries';

type MefRecord = Record<string, string | number | null | undefined>;

const MEF_BASE_URL = 'https://ofi5.mef.gob.pe';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s|-)([a-záéíóúñ])/g, match => match.toUpperCase());

const compactProjectName = (value: string): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const serviceMatch = normalized.match(
    /(?:MEJORAMIENTO|CREACION|CREACIÓN|AMPLIACION|AMPLIACIÓN|RECUPERACION|RECUPERACIÓN|REHABILITACION|REHABILITACIÓN)\s+DEL\s+SERVICIO\s+DE\s+(.+?)(?:\s+EN\s+|\s+DEL\s+|\s+DE\s+LA\s+LOCALIDAD|\s+DE\s+LA\s+CIUDAD|$)/i
  );
  const candidate = serviceMatch?.[1] || normalized;
  return toTitleCase(candidate).slice(0, 120);
};

const normalizeMunicipality = (value: string): string => {
  if (!value) return 'Municipalidad de ';
  return toTitleCase(value.replace(/^MUNICIPALIDAD\s+/i, 'Municipalidad '));
};

class ContractServices {
  private static async postMefForm(path: string, data: Record<string, string>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${MEF_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          origin: MEF_BASE_URL,
          referer: `${MEF_BASE_URL}/ssi/ssi/Index?codigo=${data.id}&tipo=1`,
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
          'x-requested-with': 'XMLHttpRequest',
        },
        body: new URLSearchParams(data),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new AppError(
          `MEF respondio ${response.status}: ${text.slice(0, 200)}`,
          502
        );
      }
      try {
        return JSON.parse(text) as MefRecord[];
      } catch {
        throw new AppError('MEF devolvio una respuesta no reconocida', 502);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  public static async lookupInvestmentByCui(cui: string) {
    const normalizedCui = cui?.replace(/\D/g, '');
    if (!normalizedCui || normalizedCui.length < 5)
      throw new AppError('Ingresa un CUI valido para consultar MEF', 400);

    const registeredContract = await prisma.contratc.findUnique({
      where: { cui: normalizedCui },
      select: {
        id: true,
        cui: true,
        contractNumber: true,
        projectShortName: true,
        projectName: true,
      },
    });

    const projectData = await this.postMefForm(
      '/invierteWS/Ssi/traeDetInvSSI',
      {
        id: normalizedCui,
        tipo: '1',
      }
    );
    if (!Array.isArray(projectData) || projectData.length === 0)
      throw new AppError(
        `No se encontraron datos para CUI ${normalizedCui}`,
        404
      );

    const project = projectData[0] || {};
    const snip = asText(project.COD_SNIP);
    const contracts = snip
      ? await this.postMefForm('/invierteWS/Ssi/traeContratoSeaceDWH', {
          id: normalizedCui,
          codsnip: snip,
          vers: 'v2',
        }).catch(() => [])
      : [];
    const firstContract = Array.isArray(contracts)
      ? contracts[0] || null
      : null;
    const projectName = asText(project.NOMBRE_INVERSION);
    const contractAmount = firstContract
      ? toNumber(
          firstContract.MTO_TOTAL ||
            firstContract.MONTO_TOTAL ||
            firstContract.MONTO_CONTRATO
        )
      : 0;
    const projectAmount = toNumber(project.COSTO_ACTUALIZADO);

    return {
      source: 'MEF_SSI',
      cui: asText(project.CODIGO_UNICO) || normalizedCui,
      registeredContract,
      snip,
      projectName,
      projectShortName: compactProjectName(projectName),
      municipality: normalizeMunicipality(
        asText(project.ENTIDAD || project.NOM_ENTIDAD)
      ),
      department: toTitleCase(asText(project.DEPARTAMENTO || project.DEP)),
      province: toTitleCase(asText(project.PROVINCIA || project.PROV)),
      district: toTitleCase(asText(project.DISTRITO || project.DIST)),
      status: asText(project.ESTADO),
      situation: asText(project.SITUACION),
      updatedCost: projectAmount,
      suggestedAmount: contractAmount || projectAmount,
      suggestedContract: firstContract
        ? {
            contractNumber: asText(
              firstContract.NUM_CONTRATO || firstContract.NRO_CONTRATO
            ),
            contractor: asText(
              firstContract.NOM_CONTRATISTA || firstContract.CONTRATISTA
            ),
            amount: contractAmount,
            date: asText(
              firstContract.FEC_SUSCRIPCION ||
                firstContract.FECHA_CONTRATO ||
                firstContract.FEC_CONTRATO
            ),
          }
        : null,
      contracts: Array.isArray(contracts)
        ? contracts.slice(0, 5).map(item => ({
            contractNumber: asText(item.NUM_CONTRATO || item.NRO_CONTRATO),
            contractor: asText(item.NOM_CONTRATISTA || item.CONTRATISTA),
            amount: toNumber(
              item.MTO_TOTAL || item.MONTO_TOTAL || item.MONTO_CONTRATO
            ),
            date: asText(
              item.FEC_SUSCRIPCION || item.FECHA_CONTRATO || item.FEC_CONTRATO
            ),
          }))
        : [],
    };
  }

  public static async showAll(
    startsWith?: string,
    companyId?: Companies['id'],
    consortiumId?: Consortium['id'],
    type?: ContractForm['type'],
    date?: string
  ) {
    if (
      (companyId && isNaN(companyId)) ||
      (consortiumId && isNaN(consortiumId))
    )
      throw new AppError('Opps, id Invalida', 400);
    const gmt_5 = 5 * 60 * 60 * 1000;
    const gte = date ? new Date(new Date(date).getTime() + gmt_5) : undefined;
    const lt = gte ? new Date(new Date(gte).setMonth(12)) : undefined;
    const showContract = await prisma.contratc.findMany({
      where: {
        cui: { startsWith },
        createdAt: { lt, gte },
        companyId,
        consortiumId,
        type,
      },
      orderBy: [{ createdAt: 'asc' }, { contractNumber: 'asc' }],
      select: Queries.selectContract.select,
    });
    return showContract;
  }

  public static async show(id: Contratc['id']) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const showContract = await prisma.contratc.findUnique({
      where: { id },
      include: {
        consortium: true,
        company: true,
      },
    });
    if (!showContract)
      throw new AppError('No existe información del contrato', 404);
    return showContract;
  }
  public static async createSpeciality(
    contratcId: Contratc['id'],
    listSpecialtiesId: ListSpecialties['id']
  ) {
    if (!contratcId || !listSpecialtiesId)
      throw new AppError('Opps, id Invalida', 400);
    const contracSpecialties = await prisma.contractSpecialties.create({
      data: {
        contratcId,
        listSpecialtiesId,
      },
      select: {
        id: true,
        listSpecialties: {
          include: {
            areaSpecialtyList: {
              select: {
                specialist: true,
              },
            },
          },
        },
        contratcId: true,
        specialists: true,
      },
    });

    const { listSpecialties } = contracSpecialties;
    const users = listSpecialties.areaSpecialtyList.map(areaSpecialty => {
      const { specialist } = areaSpecialty;
      return {
        label: specialist.firstName + ' ' + specialist.lastName,
        value: String(specialist.id),
        ...specialist,
      };
    });
    return {
      ...contracSpecialties,
      listSpecialties: {
        id: listSpecialties.id,
        name: listSpecialties.name,
        users: users,
      },
    };
  }
  public static async deleteSpecialty(
    contractSpecialtiesId: ContractSpecialties['id']
  ) {
    if (!contractSpecialtiesId) throw new AppError('Opps, id Invalida', 400);
    const deleteContractSpecialties = await prisma.contractSpecialties.delete({
      where: {
        id: contractSpecialtiesId,
      },
    });

    return deleteContractSpecialties;
  }
  public static async addSpecialist(
    contractSpecialtiesId: ContractSpecialties['id'],
    specialistsId: Specialists['id']
  ) {
    if (!contractSpecialtiesId || !specialistsId)
      throw new AppError('Opps, id Invalida', 400);
    const updateContracSpecialties = await prisma.contractSpecialties.update({
      where: {
        id: contractSpecialtiesId,
      },
      data: {
        specialistsId,
      },
    });

    return updateContracSpecialties;
  }
  public static async getSpecialities(contratcId: Contratc['id']) {
    if (!contratcId) throw new AppError('Opps, id Invalida', 400);
    const contracSpecialties = await prisma.contractSpecialties.findMany({
      select: {
        contratcId: true,
        id: true,
        listSpecialties: {
          include: {
            areaSpecialtyList: {
              select: {
                specialist: true,
              },
            },
          },
        },
        specialists: true,
      },
      where: {
        contratcId,
      },
      orderBy: { createdAt: 'asc' },
    });
    const contracSpecialtiesTransform = contracSpecialties.map(contract => {
      const { listSpecialties, specialists, id, contratcId } = contract;
      const users = listSpecialties.areaSpecialtyList.map(areaSpecialty => {
        const { specialist } = areaSpecialty;
        return {
          label: specialist.firstName + ' ' + specialist.lastName,
          value: String(specialist.id),
          ...specialist,
        };
      });
      return {
        id,
        contratcId,
        listSpecialties: {
          id: listSpecialties.id,
          name: listSpecialties.name,
          users: users,
        },
        specialists: specialists,
      };
    });
    return contracSpecialtiesTransform;
  }

  public static async create(data: ContractForm) {
    const normalizedCui = String(data.cui || '').replace(/\D/g, '');
    if (!normalizedCui)
      throw new AppError(
        'Ingresa un CUI valido para registrar el contrato',
        400
      );

    const existingContract = await prisma.contratc.findUnique({
      where: { cui: normalizedCui },
      select: {
        id: true,
        contractNumber: true,
        projectShortName: true,
        projectName: true,
      },
    });

    if (existingContract) {
      const name =
        existingContract.projectShortName ||
        existingContract.projectName ||
        existingContract.contractNumber ||
        `contrato ${existingContract.id}`;
      throw new AppError(
        `El CUI ${normalizedCui} ya esta registrado en "${name}". Abre ese contrato para editarlo o usa otro CUI.`,
        409
      );
    }

    const createContract = await prisma.contratc.create({
      data: {
        ...data,
        cui: normalizedCui,
      },
    });
    if (createContract) mkdirSync(`${_contractPath}/${createContract.id}`);
    return createContract;
  }

  public static async update(
    id: Contratc['id'],
    data: Omit<ContractForm, 'companyId' | 'consortiumId'>
  ) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const contract = await prisma.contratc.update({
      where: { id },
      data,
      include: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });
    if (contract.project?.id) {
      await prisma.projects.update({
        where: {
          id: contract.project?.id,
        },
        data: {
          name: data.projectShortName,
        },
      });
    }
    return contract;
  }

  public static async delete(id: Contratc['id']) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const findContract = await prisma.contratc.findUnique({ where: { id } });
    if (!findContract)
      throw new AppError('No se puede encontrar el contrato', 404);
    const removePath = `${_contractPath}/${findContract.id}`;
    if (!existsSync(removePath))
      throw new AppError('No se puede elimiar el contrato', 404);
    const deleteContract = await prisma.contratc.delete({ where: { id } });
    rmdirSync(removePath);
    return deleteContract;
  }

  public static async updateDetails(id: Contratc['id'], details: string) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const updateDetails = await prisma.contratc.update({
      where: { id },
      data: { details },
    });
    return updateDetails;
  }
  public static async updateObservations(
    id: Contratc['id'],
    observations: string
  ) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const updateObservations = await prisma.contratc.update({
      where: { id },
      data: { observations },
    });
    return updateObservations;
  }

  public static async updatePhases(
    id: Contratc['id'],
    phases: Contratc['phases'],
    isIndependent: string
  ) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const updateDetails = await prisma.contratc.update({
      where: { id },
      data: { phases, isIndependent: isIndependent === 'yes' },
    });
    return updateDetails;
  }

  public static async updateIndex(id: Contratc['id'], indexContract: string) {
    if (!id) throw new AppError('Opps, id Invalida', 400);
    const updateIndex = await prisma.contratc.update({
      where: { id },
      data: { indexContract },
    });
    return updateIndex;
  }
}
export default ContractServices;
