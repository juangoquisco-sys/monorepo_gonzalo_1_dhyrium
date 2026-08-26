import {
  ContractType,
  DocumentArtifactStatus,
  DocumentArtifactType,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.server';
import AppError from '@/utils/appError';
import {
  assertPdfDestination,
  countPdfDestinations,
  mapContractTree,
  parseContractIndex,
} from './contractDocumentTree';
import DocumentComposerService from '../document-composer/documentComposer.service';
import { getArtifactAbsolutePath } from '../document-composer/documentComposer.storage';
import {
  createComposerWorkDir,
  persistArtifactFile,
  removeComposerPath,
} from '../document-composer/documentComposer.storage';
import { DOCUMENT_COMPOSER_LIMITS } from '../document-composer/documentComposer.constants';

const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  companyId: z.coerce.number().int().positive().optional(),
  consortiumId: z.coerce.number().int().positive().optional(),
  period: z.coerce.number().int().min(2000).max(2100).optional(),
  instrumentType: z.nativeEnum(ContractType).optional(),
  pendingDocuments: z
    .preprocess(value => value === 'true' || value === true, z.boolean())
    .optional(),
  dueSoon: z
    .preprocess(value => value === 'true' || value === true, z.boolean())
    .optional(),
  statuses: z.string().trim().optional(),
  sort: z.enum(['recent', 'name', 'project', 'cui']).default('recent'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type ContractRecord = Prisma.ContratcGetPayload<{
  include: {
    company: true;
    consortium: true;
    documents: true;
  };
}>;

type ContractStatus =
  | 'EN_CURSO'
  | 'VENCE_PRONTO'
  | 'VENCIDO'
  | 'FINALIZADO'
  | 'AL_DIA';

const parsePhases = (value: string) => {
  try {
    const phases = JSON.parse(value);
    return Array.isArray(phases) ? phases : [];
  } catch {
    return [];
  }
};

const resolveContractStatus = (
  contract: ContractRecord,
  requiredCount: number
): { status: ContractStatus; relevantDate: Date | null } => {
  const uploadedCount = contract.documents.filter(
    document => document.currentVersionId
  ).length;
  if (requiredCount > 0 && uploadedCount >= requiredCount) {
    return { status: 'FINALIZADO', relevantDate: contract.createdAt };
  }

  const phases = parsePhases(contract.phases);
  const active = phases.find(
    phase =>
      phase &&
      typeof phase === 'object' &&
      (phase.isActive === true || Number(phase.realDay) > 0)
  ) as { realDay?: number; days?: number } | undefined;
  if (!contract.createdAt || !active) {
    return {
      status: uploadedCount > 0 ? 'AL_DIA' : 'EN_CURSO',
      relevantDate: null,
    };
  }

  const duration = Number(active.realDay ?? active.days ?? 0);
  const relevantDate = new Date(contract.createdAt);
  relevantDate.setDate(relevantDate.getDate() + duration + 1);
  const differenceDays =
    (relevantDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (differenceDays < 0) return { status: 'VENCIDO', relevantDate };
  if (differenceDays <= 14) return { status: 'VENCE_PRONTO', relevantDate };
  return { status: 'EN_CURSO', relevantDate };
};

const mapContractSummary = (contract: ContractRecord) => {
  const requiredDocuments = countPdfDestinations(
    parseContractIndex(contract.indexContract)
  );
  const uploadedDocuments = contract.documents.filter(
    document => document.currentVersionId
  ).length;
  const status = resolveContractStatus(contract, requiredDocuments);
  return {
    id: contract.id,
    cui: contract.cui,
    name: contract.name,
    contractNumber: contract.contractNumber,
    projectName: contract.projectName,
    projectShortName: contract.projectShortName,
    entity: contract.municipality,
    type: contract.type,
    signedAt: contract.createdAt,
    status: status.status,
    relevantDate: status.relevantDate,
    company: contract.company
      ? { id: contract.company.id, name: contract.company.name }
      : null,
    consortium: contract.consortium
      ? { id: contract.consortium.id, name: contract.consortium.name }
      : null,
    documentProgress: {
      required: requiredDocuments,
      uploaded: uploadedDocuments,
      percentage:
        requiredDocuments === 0
          ? 0
          : Math.round((uploadedDocuments / requiredDocuments) * 100),
    },
  };
};

const assertSingleScope = (input: {
  companyId?: number;
  consortiumId?: number;
}) => {
  if (input.companyId && input.consortiumId) {
    throw new AppError(
      'Selecciona una empresa o un consorcio, no ambos.',
      400,
      'CONTRACT_SCOPE_INVALID'
    );
  }
};

class ContractDocumentsService {
  static async listScopes() {
    const [companies, consortiums] = await Promise.all([
      prisma.companies.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { contracts: true } },
        },
      }),
      prisma.consortium.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { contracts: true } },
        },
      }),
    ]);
    return [
      ...companies.map(company => ({
        type: 'company' as const,
        id: company.id,
        name: company.name,
        contractCount: company._count.contracts,
      })),
      ...consortiums.map(consortium => ({
        type: 'consortium' as const,
        id: consortium.id,
        name: consortium.name,
        contractCount: consortium._count.contracts,
      })),
    ];
  }

  static async listContracts(rawQuery: unknown) {
    const query = listQuerySchema.parse(rawQuery);
    assertSingleScope(query);
    const createdAt =
      query.period === undefined
        ? undefined
        : {
            gte: new Date(`${query.period}-01-01T00:00:00.000Z`),
            lt: new Date(`${query.period + 1}-01-01T00:00:00.000Z`),
          };
    const where: Prisma.ContratcWhereInput = {
      companyId: query.companyId,
      consortiumId: query.consortiumId,
      type: query.instrumentType,
      createdAt,
      OR: query.search
        ? [
            { cui: { contains: query.search, mode: 'insensitive' } },
            {
              contractNumber: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              projectName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };

    const records = await prisma.contratc.findMany({
      where,
      include: {
        company: true,
        consortium: true,
        documents: true,
      },
    });
    let contracts = records.map(mapContractSummary);
    const requestedStatuses = new Set(
      (query.statuses || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
    );
    if (requestedStatuses.size > 0) {
      contracts = contracts.filter(contract =>
        requestedStatuses.has(contract.status)
      );
    }
    if (query.pendingDocuments) {
      contracts = contracts.filter(
        contract =>
          contract.documentProgress.uploaded <
          contract.documentProgress.required
      );
    }
    if (query.dueSoon) {
      contracts = contracts.filter(
        contract => contract.status === 'VENCE_PRONTO'
      );
    }
    contracts.sort((a, b) => {
      if (query.sort === 'name') return a.name.localeCompare(b.name);
      if (query.sort === 'project')
        return a.projectName.localeCompare(b.projectName);
      if (query.sort === 'cui') return a.cui.localeCompare(b.cui);
      return (b.signedAt?.getTime() || 0) - (a.signedAt?.getTime() || 0);
    });

    const total = contracts.length;
    const start = (query.page - 1) * query.limit;
    return {
      data: contracts.slice(start, start + query.limit),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  static async getContract(contractId: number) {
    const contract = await prisma.contratc.findUnique({
      where: { id: contractId },
      include: {
        company: true,
        consortium: true,
        documents: true,
      },
    });
    if (!contract) {
      throw new AppError(
        'El contrato solicitado no existe.',
        404,
        'CONTRACT_NOT_FOUND'
      );
    }
    return mapContractSummary(contract);
  }

  static async getTree(contractId: number) {
    const contract = await prisma.contratc.findUnique({
      where: { id: contractId },
      include: { documents: true },
    });
    if (!contract) {
      throw new AppError(
        'El contrato solicitado no existe.',
        404,
        'CONTRACT_NOT_FOUND'
      );
    }
    return {
      contractId,
      tree: mapContractTree(contract.indexContract, contract.documents),
    };
  }

  private static async attachArtifact(input: {
    contractId: number;
    levelCode: string;
    artifactId: string;
    userId: number;
    expectedCurrentVersionId?: string;
  }) {
    const [contract, artifact] = await Promise.all([
      prisma.contratc.findUnique({ where: { id: input.contractId } }),
      DocumentComposerService.getOwnedArtifact(input.userId, input.artifactId),
    ]);
    if (!contract) {
      throw new AppError(
        'El contrato solicitado no existe.',
        404,
        'CONTRACT_NOT_FOUND'
      );
    }
    if (artifact.mimeType !== 'application/pdf') {
      throw new AppError(
        'El artefacto no es un PDF válido.',
        415,
        'DOCUMENT_PDF_INVALID'
      );
    }
    if (
      artifact.status !== DocumentArtifactStatus.TEMPORARY &&
      artifact.status !== DocumentArtifactStatus.PUBLISHED
    ) {
      throw new AppError(
        'El artefacto no está disponible para publicación.',
        409,
        'DOCUMENT_ARTIFACT_STATE_INVALID'
      );
    }
    const level = assertPdfDestination(contract.indexContract, input.levelCode);

    return prisma.$transaction(async transaction => {
      const document = await transaction.contractDocument.upsert({
        where: {
          contractId_levelCode: {
            contractId: input.contractId,
            levelCode: input.levelCode,
          },
        },
        create: {
          contractId: input.contractId,
          levelCode: input.levelCode,
          levelName: level.name.trim(),
        },
        update: { levelName: level.name.trim() },
        include: { currentVersion: true },
      });

      if (document.currentVersion?.artifactId === input.artifactId) {
        return document.currentVersion;
      }
      if (
        input.expectedCurrentVersionId !== undefined &&
        document.currentVersionId !== input.expectedCurrentVersionId
      ) {
        throw new AppError(
          'El documento cambió mientras lo editabas. Actualiza e intenta nuevamente.',
          409,
          'CONTRACT_DOCUMENT_VERSION_CONFLICT'
        );
      }

      const otherUse = await transaction.contractDocumentVersion.findFirst({
        where: {
          artifactId: input.artifactId,
          contractDocumentId: { not: document.id },
        },
      });
      if (otherUse) {
        throw new AppError(
          'El artefacto ya está asociado a otro documento.',
          409,
          'DOCUMENT_ARTIFACT_IN_USE'
        );
      }

      const versionCount = await transaction.contractDocumentVersion.count({
        where: { contractDocumentId: document.id },
      });
      const version = await transaction.contractDocumentVersion.create({
        data: {
          contractDocumentId: document.id,
          artifactId: artifact.id,
          versionNumber: versionCount + 1,
          authorId: input.userId,
          previousVersionId: document.currentVersionId,
        },
      });
      await transaction.contractDocument.update({
        where: { id: document.id },
        data: { currentVersionId: version.id },
      });
      await transaction.documentArtifact.update({
        where: { id: artifact.id },
        data: {
          status: DocumentArtifactStatus.PUBLISHED,
          expiresAt: null,
        },
      });
      return version;
    });
  }

  static async attach(input: {
    contractId: number;
    levelCode: string;
    artifactId: string;
    userId: number;
  }) {
    const version = await ContractDocumentsService.attachArtifact(input);
    return {
      status: 'SUBIDO',
      versionId: version.id,
      artifactId: version.artifactId,
    };
  }

  static async replace(input: {
    contractId: number;
    levelCode: string;
    artifactId: string;
    userId: number;
    expectedCurrentVersionId: string;
  }) {
    const version = await ContractDocumentsService.attachArtifact(input);
    return {
      status: 'SUBIDO',
      versionId: version.id,
      artifactId: version.artifactId,
    };
  }

  static async getCurrentDocument(contractId: number, levelCode: string) {
    const document = await prisma.contractDocument.findUnique({
      where: { contractId_levelCode: { contractId, levelCode } },
      include: {
        currentVersion: {
          include: { artifact: true },
        },
      },
    });
    if (!document?.currentVersion) {
      throw new AppError(
        'Este nivel aún no tiene un PDF publicado.',
        404,
        'CONTRACT_DOCUMENT_NOT_FOUND'
      );
    }
    return document;
  }

  static async getEditSource(
    contractId: number,
    levelCode: string,
    userId: number
  ) {
    const document = await ContractDocumentsService.getCurrentDocument(
      contractId,
      levelCode
    );
    const currentArtifact = document.currentVersion!.artifact;
    let artifact = currentArtifact;
    if (currentArtifact.ownerId !== userId) {
      const idempotencyKey = `contract-edit-${document.currentVersion!.id}`;
      const existing = await prisma.documentArtifact.findUnique({
        where: {
          ownerId_idempotencyKey: { ownerId: userId, idempotencyKey },
        },
      });
      if (
        existing &&
        (!existing.expiresAt || existing.expiresAt.getTime() > Date.now())
      ) {
        artifact = existing;
      } else {
        if (existing) {
          await removeComposerPath(
            getArtifactAbsolutePath(existing.storageKey)
          );
          await prisma.documentArtifact.delete({ where: { id: existing.id } });
        }
        const artifactId = randomUUID();
        const workDir = await createComposerWorkDir();
        const copyPath = path.join(workDir, 'source.pdf');
        try {
          await copyFile(
            getArtifactAbsolutePath(currentArtifact.storageKey),
            copyPath
          );
          const { storageKey } = await persistArtifactFile(
            copyPath,
            userId,
            artifactId
          );
          artifact = await prisma.documentArtifact.create({
            data: {
              id: artifactId,
              ownerId: userId,
              type: DocumentArtifactType.ORIGINAL_PDF,
              status: DocumentArtifactStatus.TEMPORARY,
              safeName: currentArtifact.safeName,
              originalName: currentArtifact.safeName,
              storageKey,
              mimeType: 'application/pdf',
              sizeBytes: currentArtifact.sizeBytes,
              pageCount: currentArtifact.pageCount,
              sha256: currentArtifact.sha256,
              idempotencyKey,
              expiresAt: new Date(
                Date.now() + DOCUMENT_COMPOSER_LIMITS.artifactTtlMs
              ),
            },
          });
        } finally {
          await removeComposerPath(workDir);
        }
      }
    }
    return {
      documentId: document.id,
      levelCode: document.levelCode,
      levelName: document.levelName,
      currentVersionId: document.currentVersion!.id,
      artifact: {
        id: artifact.id,
        name: artifact.safeName,
        pageCount: artifact.pageCount,
        sizeBytes: artifact.sizeBytes,
        status: artifact.status,
        type: artifact.type,
        mimeType: artifact.mimeType,
        createdAt: artifact.createdAt,
        expiresAt: artifact.expiresAt,
        downloadUrl: `/api/v1/document-composer/artifacts/${artifact.id}/download`,
      },
    };
  }

  static async getDownload(contractId: number, levelCode: string) {
    const document = await ContractDocumentsService.getCurrentDocument(
      contractId,
      levelCode
    );
    const artifact = document.currentVersion!.artifact;
    return {
      artifact,
      absolutePath: getArtifactAbsolutePath(artifact.storageKey),
    };
  }

  static async removeCurrent(
    contractId: number,
    levelCode: string,
    expectedCurrentVersionId?: string
  ) {
    const document = await ContractDocumentsService.getCurrentDocument(
      contractId,
      levelCode
    );
    if (
      expectedCurrentVersionId &&
      document.currentVersionId !== expectedCurrentVersionId
    ) {
      throw new AppError(
        'El documento cambió. Actualiza e intenta nuevamente.',
        409,
        'CONTRACT_DOCUMENT_VERSION_CONFLICT'
      );
    }
    await prisma.contractDocument.update({
      where: { id: document.id },
      data: { currentVersionId: null },
    });
  }
}

export default ContractDocumentsService;
