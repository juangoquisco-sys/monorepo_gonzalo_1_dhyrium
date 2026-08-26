import type { ContractIndexData } from '@/types/types';
import type { FilterContract } from './type.contracts';

export const CONTRACT_INDEX_DATA: ContractIndexData[] = [
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
          {
            id: '2.1.1',
            name: 'CARTA DE PAGO 1',
            nivel: 3,
            hasFile: 'no',
          },
          { id: '2.1.2', name: 'CARTA DE PAGO 2', nivel: 3, hasFile: 'no' },
          {
            id: '2.1.3',
            name: 'CARTA DE PAGO 3',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '2.1.4',
            name: 'CARTA DE PAGO 4',
            nivel: 3,
            hasFile: 'no',
          },
          {
            id: '2.1.5',
            name: 'CARTA DE PAGO 5',
            nivel: 3,
            hasFile: 'no',
          },
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
      {
        id: '4.2',
        name: 'OFERTA ECONÓMICA',
        nivel: 2,
        hasFile: 'no',
      },
      {
        id: '4.3',
        name: 'OFERTA TÉCNICA',
        nivel: 2,
        hasFile: 'no',
      },
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

export const PRICE_DIFFICULTY = {
  1: {
    bachelorCost: 1800,
    professionalCost: 2500,
  },
  2: {
    bachelorCost: 2550,
    professionalCost: 3250,
  },
  3: {
    bachelorCost: 3300,
    professionalCost: 4000,
  },
};

export const DIFFICULTY_LEVEL = [
  { key: 1, name: 'Level 1' },
  { key: 2, name: 'Level 2' },
  { key: 3, name: 'Level 3' },
];
export const STATUS_CONTRACT = [
  { key: 'red', name: 'No entregado - plazo vencido' },
  // { key: 'grey', name: 'Entregado - archivado' },
  { key: 'skyBlue', name: 'No entregado - en curso' },
  { key: 'yellow', name: 'No entregado - inminente' },
  // { key: 'green', name: 'Entegado anticipadamente' },
  { key: 'grey', name: 'Bloqueado' },
];
export const CONTRACT_TYPE = [
  { key: 'CONTRATO', name: 'Contrato' },
  { key: 'ORDEN_DE_SERVICIO', name: 'Orden de servicio' },
  { key: 'CONTRATACION_DIRECTA', name: 'Contratación directa' },
];

export const INIT_VALUES_FILTER_CONTRACT: FilterContract = {
  date: '',
  type: '',
  status: '',
};
