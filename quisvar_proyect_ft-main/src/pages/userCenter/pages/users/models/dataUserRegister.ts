export const JOB_DATA = [
  { value: 'Ingeniería Agronómica', abrv: 'Ing' },
  { value: 'Ingeniería Agroindustrial', abrv: 'Ing' },
  { value: 'Ingeniería Agrícola', abrv: 'Ing' },
  { value: 'Ingeniería Topográfica y Agrimensura', abrv: 'Ing' },
  { value: 'Ingeniería Civil', abrv: 'Ing' },
  { value: 'Arquitectura y Urbanismo', abrv: 'Arq' },
  { value: 'Ingeniería Económica', abrv: 'Ing' },
  { value: 'Ingeniería Estadística e Informática', abrv: 'Ing' },
  { value: 'Ingeniería Geológica', abrv: 'Ing' },
  { value: 'Ingeniería Metalúrgica', abrv: 'Ing' },
  { value: 'Ingeniería Electrónica', abrv: 'Ing' },
  { value: 'Ingeniería Mecánica Eléctrica', abrv: 'Ing' },
  { value: 'Ingeniería de Sistemas', abrv: 'Ing' },
  { value: 'Ingenieria de Minas', abrv: 'Ing' },
  { value: 'Ingeniería Química', abrv: 'Ing' },
  { value: 'Ingeniería Sanitaria y Ambiental', abrv: 'Ing' },
  { value: 'Ciencias Biológicas', abrv: 'Lic' },
  { value: 'Ciencias Biológicas: Pesquería', abrv: 'Lic' },
  { value: 'Ciencias Biológicas: Microbiología', abrv: 'Lic' },
  { value: 'Nutrición Humana', abrv: 'Lic' },
  { value: 'Odontología', abrv: 'Lic' },
  { value: 'Enfermería', abrv: 'Lic' },
  { value: 'Medicina Humana', abrv: 'Lic' },
  { value: 'Medicina Veterinaria y Zootecnia', abrv: 'Lic' },
  { value: 'Ciencias Contables', abrv: 'Lic' },
  { value: 'Administración', abrv: 'Lic' },
  { value: 'Gestión Pública y Desarrollo Social', abrv: 'Lic' },
  { value: 'Física', abrv: 'Lic' },
  { value: 'Inicial', abrv: 'Lic' },
  { value: 'Primaria', abrv: 'Lic' },
  { value: 'Secundaria', abrv: 'Lic' },
  { value: 'Derecho', abrv: 'Lic' },
  { value: 'Antropología', abrv: 'Lic' },
  { value: 'Arte', abrv: 'Lic' },
  { value: 'Ciencias de la Comunicación Social', abrv: 'Lic' },
  { value: 'Sociología', abrv: 'Lic' },
  { value: 'Turismo', abrv: 'Lic' },
  { value: 'Trabajo Social', abrv: 'Lic' },
  { value: 'Técnico en Topografía y Geodesia', abrv: 'Tec' },
];
const professionalCost = {
  1: 2500,
  2: 3250,
  3: 4000,
};
export const GENDER = [
  {
    id: 0,
    value: 'Masculino',
    abrv: 'M',
  },
  {
    id: 1,
    value: 'Femenino',
    abrv: 'F',
  },
];
export const PROJECT_STATUS = [
  {
    id: 0,
    value: 'APTO',
    color: 'Green',
  },
  {
    id: 1,
    value: 'NO APTO',
    color: 'Red',
  },
  {
    id: 2,
    value: 'EN REVISION',
    color: 'Yellow',
  },
];
export const TUITION = [
  {
    id: 0,
    value: 'CIP',
  },
  {
    id: 1,
    value: 'CAP',
  },
  {
    id: 2,
    value: 'CCP',
  },
];
export const DEGREE_DATA = [
  {
    id: 0,
    value: 'Practicante',
    abrv: 'Prac',
    title: 'Practicante',
    cost: {
      1: 900,
      2: 1350,
      3: 2100,
    },
  },
  {
    id: 1,
    value: 'Egresado',
    abrv: 'Gda',
    title: 'Asistente',
    cost: {
      1: 1200,
      2: 1950,
      3: 2700,
    },
  },
  {
    id: 2,
    value: 'Bachiller',
    abrv: 'Bach',
    title: 'Asistente',
    cost: {
      1: 1800,
      2: 2550,
      3: 3300,
    },
  },
  {
    id: 3,
    value: 'Titulado',
    abrv: 'Tit',
    title: 'Profesional',
    cost: professionalCost,
  },
  {
    id: 4,
    value: 'Magister',
    abrv: 'Mg',
    title: 'Profesional',
    cost: professionalCost,
  },
  {
    id: 5,
    value: 'Doctorado',
    abrv: 'Dr',
    title: 'Profesional',
    cost: professionalCost,
  },
];

export const PROFESSIONAL_SERVICE_LEVEL_DATA = [
  { id: 1, value: 'Nivel 1' },
  { id: 2, value: 'Nivel 2' },
  { id: 3, value: 'Nivel 3' },
];

export const PAYROLL_CONTRACT_TYPE_DATA = [
  { id: 0, value: 'PLANILLA', label: 'Planilla' },
  { id: 1, value: 'LOCACION', label: 'Locación' },
  { id: 2, value: 'PRACTICAS', label: 'Prácticas' },
  { id: 3, value: 'OTRO', label: 'Otro' },
];
