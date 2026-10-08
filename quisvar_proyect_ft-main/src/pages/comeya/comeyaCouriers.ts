// Padrón de repartidores de ComeYa. El Excel de mercado no trae repartidores: la hoja 09_Delivery_Competencia
// solo identifica de dónde salen (motorizados independientes y mototaxistas, que hoy reparten sin comisión),
// así que el padrón arranca vacío y se levanta en campo desde el formulario.

export type ComeyaCourier = {
  name: string;
  dni: string;
  phone: string;
  vehicle: string;
  plate: string;
  zones: string;
  shift: string;
  license: string;
  soat: string;
  status: string;
  source: string;
  lat?: number;
  lng?: number;
};

// Vehículos que realmente circulan en Puno para reparto de comida.
export const courierVehicles = ['Moto lineal', 'Mototaxi', 'Bicicleta', 'Auto', 'A pie'];

// Turnos alineados a las horas pico reales de las cartas (hojas 01-07 del Excel).
export const courierShifts = [
  'Madrugada 05:00–09:00 · desayunos y carretillas',
  'Almuerzo 11:00–16:00 · menú del día',
  'Noche 17:00–23:00 · pollerías y chifas',
  'Nocturno 23:00–02:00 · cena tardía y licorería',
];

export const courierStatuses = ['En evaluación', 'Disponible', 'En ruta', 'Inactivo'];

// De dónde se capta, según la lectura competitiva de la hoja 09_Delivery_Competencia.
export const courierSources = [
  'Motorizado independiente',
  'Mototaxista de paradero',
  'Taxista local',
  'Repartidor de otra plataforma',
  'Referido por restaurante',
  'Postulación directa',
];
