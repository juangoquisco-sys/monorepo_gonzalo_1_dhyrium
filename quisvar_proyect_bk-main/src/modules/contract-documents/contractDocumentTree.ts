import type { ContractDocument } from '@prisma/client';
import AppError from '@/utils/appError';

export type LegacyTreeNode = {
  id: string;
  name: string;
  nivel: number;
  hasFile?: string;
  nextLevel?: LegacyTreeNode[];
  deliverLettersId?: number;
};

export type ContractTreeNode = {
  code: string;
  name: string;
  level: number;
  acceptsPdf: boolean;
  status: 'PENDIENTE' | 'SUBIDO';
  documentId: string | null;
  currentVersionId: string | null;
  children: ContractTreeNode[];
};

export const CONTRACT_INDEX_FALLBACK: LegacyTreeNode[] = [
  {
    id: '1',
    name: 'CONFORMIDAD',
    nivel: 1,
    nextLevel: [
      { id: '1.1', name: 'CONFORMIDAD', nivel: 2, hasFile: 'no' },
      {
        id: '1.2',
        name: 'CARTA DE SOLICITUD DE CONFORMIDAD',
        nivel: 2,
        hasFile: 'no',
      },
    ],
  },
  {
    id: '2',
    name: 'EJECUCIÓN CONTRACTUAL',
    nivel: 1,
    nextLevel: [
      {
        id: '2.1',
        name: 'CARTA DEL NÚMERO DE PAGOS',
        nivel: 2,
        nextLevel: [
          { id: '2.1.1', name: 'CARTA DE PAGO 1', nivel: 3, hasFile: 'no' },
          { id: '2.1.2', name: 'CARTA DE PAGO 2', nivel: 3, hasFile: 'no' },
          { id: '2.1.3', name: 'CARTA DE PAGO 3', nivel: 3, hasFile: 'no' },
          { id: '2.1.4', name: 'CARTA DE PAGO 4', nivel: 3, hasFile: 'no' },
          { id: '2.1.5', name: 'CARTA DE PAGO 5', nivel: 3, hasFile: 'no' },
        ],
      },
      {
        id: '2.2',
        name: 'CARTAS ENTREGABLES',
        nivel: 2,
        nextLevel: [],
      },
      {
        id: '2.3',
        name: 'PROGRAMA DE PLAZOS DE ENTREGA SEGÚN CONTRATO',
        nivel: 2,
        hasFile: 'no',
      },
      {
        id: '2.4',
        name: 'LISTA DE PROFESIONALES SEGÚN CONTRATO ',
        nivel: 2,
        hasFile: 'no',
      },
    ],
  },
  {
    id: '3',
    name: 'PERFECCIONAMIENTO DE CONTRATO',
    nivel: 1,
    nextLevel: [
      { id: '3.1', name: 'CONTRATOS', nivel: 2, hasFile: 'no' },
      {
        id: '3.2',
        name: 'SUBSANACIÓN DE OBSERVACIONES DEL PERFECCIONAMIENTO DE CONTRATO',
        nivel: 2,
        hasFile: 'no',
      },
      {
        id: '3.3',
        name: 'CARTA DE ENTREGA DEL PERFECCIONAMIENTO DE CONTRATO',
        nivel: 2,
        hasFile: 'no',
      },
      {
        id: '3.4',
        name: 'EXPEDIENTE PERFECCIONAMIENTO DE CONTRATO',
        nivel: 2,
        nextLevel: [
          {
            id: '3.4.1',
            name: 'Garantía de fiel cumplimiento del contrato.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.2',
            name: 'Garantía de fiel cumplimiento por prestaciones accesorias, de ser el caso.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.3',
            name: 'Contrato de consorcio con firmas legalizadas ante Notario de cada uno de los integrantes, de ser el caso.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.4',
            name: 'Código de cuenta interbancaria (CCI) o, en el caso de proveedores no domiciliados, el número de su cuenta bancaria y la entidad bancaria en el exterior',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.5',
            name: 'Copia de la vigencia del poder del representante legal de la empresa que acredite que cuenta con facultades para perfeccionar el contrato, cuando corresponda.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.6',
            name: 'Copia de DNI del postor en caso de persona natural, o de su representante legal en caso de persona jurídica.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.7',
            name: 'Domicilio para efectos de la notificación durante la ejecución del contrato.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.8',
            name: 'Autorización de notificación de la decisión de la Entidad sobre la solicitud de ampliación de plazo mediante medios electrónicos de comunicación',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.9',
            name: 'Detalle de los precios unitarios de la oferta económica',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.10',
            name: 'Estructura de costos de la oferta económica.',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.11',
            name: 'Detalle del monto de la oferta económica de cada uno de los servicios de consultoría de obra que conforman el paquete',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.12',
            name: 'Copia de los diplomas que acrediten la formación académica requerida del personal clave',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '3.4.13',
            name: 'a) Copia de (i) contratos y su respectiva conformidad o (ii) constancias o (iii) certificados o (iv) cualquier otra documentación que, de manera fehaciente demuestre la experiencia del personal clave.',
            nivel: 3,
            hasFile: 'no',
          },
        ],
      },
    ],
  },
  {
    id: '4',
    name: 'PRESENTACIÓN DE OFERTAS',
    nivel: 1,
    nextLevel: [
      { id: '4.1', name: 'SUBSANACIÓN DE OFERTAS', nivel: 2, hasFile: 'no' },
      { id: '4.2', name: 'OFERTA ECONÓMICA', nivel: 2, hasFile: 'no' },
      { id: '4.3', name: 'OFERTA TÉCNICA', nivel: 2, hasFile: 'no' },
    ],
  },
  {
    id: '5',
    name: 'BASES INTEGRADAS',
    nivel: 1,
    nextLevel: [
      { id: '5.1', name: 'BASES INTEGRADAS', nivel: 2, hasFile: 'no' },
      {
        id: '5.2',
        name: 'Observación de bases administrativas',
        nivel: 2,
        hasFile: 'no',
      },
    ],
  },
];

const isLegacyNode = (value: unknown): value is LegacyTreeNode => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LegacyTreeNode>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.nivel === 'number' &&
    (candidate.nextLevel === undefined ||
      (Array.isArray(candidate.nextLevel) &&
        candidate.nextLevel.every(isLegacyNode)))
  );
};

export const parseContractIndex = (value: string): LegacyTreeNode[] => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(isLegacyNode)) return parsed;
  } catch {
    // The stable fallback keeps contracts usable when legacy JSON is corrupt.
  }
  return CONTRACT_INDEX_FALLBACK;
};

export const findLegacyTreeNode = (
  nodes: LegacyTreeNode[],
  code: string
): LegacyTreeNode | null => {
  for (const node of nodes) {
    if (node.id === code) return node;
    const child = findLegacyTreeNode(node.nextLevel || [], code);
    if (child) return child;
  }
  return null;
};

export const assertPdfDestination = (
  indexContract: string,
  levelCode: string
) => {
  const node = findLegacyTreeNode(parseContractIndex(indexContract), levelCode);
  if (!node) {
    throw new AppError(
      'El nivel documental no existe en este contrato.',
      422,
      'CONTRACT_DOCUMENT_LEVEL_INVALID'
    );
  }
  if (node.hasFile === undefined) {
    throw new AppError(
      'El nivel seleccionado es un grupo y no admite archivos PDF.',
      422,
      'CONTRACT_DOCUMENT_LEVEL_INVALID'
    );
  }
  return node;
};

export const countPdfDestinations = (nodes: LegacyTreeNode[]): number =>
  nodes.reduce(
    (total, node) =>
      total +
      (node.hasFile !== undefined ? 1 : 0) +
      countPdfDestinations(node.nextLevel || []),
    0
  );

export const mapContractTree = (
  indexContract: string,
  documents: Pick<ContractDocument, 'id' | 'levelCode' | 'currentVersionId'>[]
): ContractTreeNode[] => {
  const documentsByLevel = new Map(
    documents.map(document => [document.levelCode, document])
  );
  const mapNode = (node: LegacyTreeNode): ContractTreeNode => {
    const document = documentsByLevel.get(node.id);
    return {
      code: node.id,
      name: node.name.trim(),
      level: node.nivel,
      acceptsPdf: node.hasFile !== undefined,
      status: document?.currentVersionId ? 'SUBIDO' : 'PENDIENTE',
      documentId: document?.id || null,
      currentVersionId: document?.currentVersionId || null,
      children: (node.nextLevel || []).map(mapNode),
    };
  };
  return parseContractIndex(indexContract).map(mapNode);
};
