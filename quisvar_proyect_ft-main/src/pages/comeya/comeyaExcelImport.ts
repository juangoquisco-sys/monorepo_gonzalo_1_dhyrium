// Lee un Excel de mercado de ComeYa en el navegador y devuelve los datos listos para usar en la app.
// Soporta el formato v8 (hojas 08_Restaurantes, 09C_Registro_Repartidores, 09B_Empresas_Reparto_Taxi)
// y las versiones anteriores, donde las cabeceras están en otra fila o faltan hojas.
import * as ExcelJS from 'exceljs';
import type { FullCatalogProduct } from './comeyaFullCatalog';
import type { ComeyaRestaurant } from './comeyaRestaurants';
import type { ComeyaCourier } from './comeyaCouriers';
import type { DeliveryZone } from './comeyaMarketData';

export type DeliveryCompany = {
  name: string;
  type: string;
  service: string;
  phone: string;
  address: string;
  zone: string;
  units: string;
  interested: string;
  contactState: string;
  source: string;
  lat?: number;
  lng?: number;
};

export type ComeyaDataset = {
  version: string;
  fileName: string;
  importedAt: string;
  products: FullCatalogProduct[];
  restaurants: ComeyaRestaurant[];
  couriers: ComeyaCourier[];
  companies: DeliveryCompany[];
  zones: DeliveryZone[];
  sheetsFound: string[];
};

const text = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (value instanceof Date) return value.toLocaleDateString('es-PE');
  if (typeof value === 'object') {
    const rich = value as { richText?: Array<{ text: string }>; text?: string; result?: unknown; hyperlink?: string };
    if (rich.richText) return rich.richText.map(part => part.text).join('').trim();
    if (rich.text) return String(rich.text).trim();
    if (rich.result !== undefined && rich.result !== null) return String(rich.result).trim();
    if (rich.hyperlink) return String(rich.hyperlink).trim();
  }
  return '';
};

const num = (value: ExcelJS.CellValue): number => {
  const parsed = Number(text(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Las plantillas del Excel traen una fila de muestra que dice "EJEMPLO — borrar esta fila".
const isTemplateRow = (value: string) => /ejemplo/i.test(value);

// Busca en qué fila están las cabeceras: la primera que contenga la etiqueta esperada.
const findHeaderRow = (sheet: ExcelJS.Worksheet, marker: string, limit = 8) => {
  const target = normalize(marker);
  for (let row = 1; row <= limit; row++) {
    const values = sheet.getRow(row).values as ExcelJS.CellValue[];
    if (values?.some(cell => normalize(text(cell)) === target)) return row;
  }
  return 0;
};

const columnIndex = (sheet: ExcelJS.Worksheet, headerRow: number) => {
  const map = new Map<string, number>();
  const values = sheet.getRow(headerRow).values as ExcelJS.CellValue[];
  values?.forEach((cell, index) => {
    const label = normalize(text(cell));
    if (label && !map.has(label)) map.set(label, index);
  });
  return (...labels: string[]) => {
    for (const label of labels) {
      const found = map.get(normalize(label));
      if (found) return found;
    }
    return 0;
  };
};

const sheetByName = (workbook: ExcelJS.Workbook, name: string) => {
  const target = normalize(name);
  return workbook.worksheets.find(sheet => normalize(sheet.name) === target)
    ?? workbook.worksheets.find(sheet => normalize(sheet.name).startsWith(target));
};

function readProducts(workbook: ExcelJS.Workbook): FullCatalogProduct[] {
  const sheet = sheetByName(workbook, '98_Catalogo');
  if (!sheet) return [];
  const headerRow = findHeaderRow(sheet, 'CATEGORÍA') || findHeaderRow(sheet, 'CATEGORIA') || 1;
  const at = columnIndex(sheet, headerRow);
  const cols = {
    carta: at('LISTA', 'CARTA'),
    category: at('CATEGORÍA', 'CATEGORIA'),
    name: at('PRODUCTO', 'PRODUCTO / PLATO'),
    description: at('DESCRIPCIÓN', 'DESCRIPCION'),
    ingredients: at('INGREDIENTES'),
    portion: at('PORCIÓN TÍPICA', 'PORCION TIPICA', 'PORCIÓN', 'PORCION'),
    segment: at('SEGMENTO'),
    priceMin: at('PRECIO MÍN', 'PRECIO MIN', 'PRECIO MÍN S/', 'PRECIO MIN S/'),
    priceMax: at('PRECIO MÁX', 'PRECIO MAX', 'PRECIO MÁX S/', 'PRECIO MAX S/'),
    priceAvg: at('PRECIO PROM', 'PRECIO PROM S/'),
    peakHour: at('HORA PICO'),
    prep: at('PREP', 'PREP (min)'),
    delivery: at('APTO DELIVERY'),
    localType: at('TIPO DE LOCAL'),
    note: at('OBSERVACIÓN', 'OBSERVACION', 'OBSERVACIÓN COMERCIAL', 'OBSERVACION COMERCIAL'),
  };
  if (!cols.name || !cols.category) return [];
  const products: FullCatalogProduct[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    const cells = sheet.getRow(row);
    const name = text(cells.getCell(cols.name).value);
    const category = text(cells.getCell(cols.category).value);
    if (!name || !category) continue;
    products.push({
      category,
      name,
      description: text(cells.getCell(cols.description).value),
      ingredients: text(cells.getCell(cols.ingredients).value),
      portion: text(cells.getCell(cols.portion).value),
      segment: text(cells.getCell(cols.segment).value),
      priceMin: num(cells.getCell(cols.priceMin).value),
      priceMax: num(cells.getCell(cols.priceMax).value),
      pricePromedio: num(cells.getCell(cols.priceAvg).value),
      peakHour: text(cells.getCell(cols.peakHour).value),
      prepMinutes: num(cells.getCell(cols.prep).value),
      deliverySuitability: text(cells.getCell(cols.delivery).value),
      localType: text(cells.getCell(cols.localType).value),
      note: text(cells.getCell(cols.note).value),
    });
  }
  return products;
}

function readRestaurants(workbook: ExcelJS.Workbook): ComeyaRestaurant[] {
  const sheet = sheetByName(workbook, '08_Restaurantes');
  if (!sheet) return [];
  const headerRow = findHeaderRow(sheet, 'NOMBRE COMERCIAL') || findHeaderRow(sheet, 'NOMBRE DEL LOCAL') || 1;
  const at = columnIndex(sheet, headerRow);
  const cols = {
    name: at('NOMBRE COMERCIAL', 'NOMBRE DEL LOCAL'),
    localType: at('TIPO DE LOCAL'),
    cuisine: at('COCINA / ESPECIALIDAD'),
    address: at('DIRECCIÓN', 'DIRECCION'),
    zone: at('ZONA'),
    segment: at('SEGMENTO'),
    cartas: at('CARTAS QUE TRABAJA'),
    dailyMenu: at('¿MENÚ DIARIO?', '¿MENU DIARIO?', 'MENÚ DIARIO'),
    menuPrice: at('PRECIO MENÚ S/', 'PRECIO MENU S/'),
    cartaRange: at('RANGO CARTA S/'),
    phone: at('CELULAR / WHATSAPP', 'TELÉFONO', 'TELEFONO', 'TELÉFONO FIJO'),
    landline: at('TELÉFONO FIJO', 'TELEFONO FIJO'),
    schedule: at('HORARIO'),
    ownDelivery: at('¿DELIVERY PROPIO?', 'DELIVERY PROPIO'),
    platform: at('PLATAFORMA ACTUAL'),
    priority: at('PRIORIDAD COMEYA'),
    source: at('FUENTE / OBSERVACIÓN', 'FUENTE / ESTADO', 'FUENTE / OBSERVACION'),
    lat: at('LATITUD'),
    lng: at('LONGITUD'),
  };
  if (!cols.name) return [];
  const restaurants: ComeyaRestaurant[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    const cells = sheet.getRow(row);
    const name = text(cells.getCell(cols.name).value);
    const localType = text(cells.getCell(cols.localType).value);
    if (!name || !localType || isTemplateRow(name)) continue;
    const phone = text(cells.getCell(cols.phone).value) || text(cells.getCell(cols.landline).value);
    restaurants.push({
      name,
      localType,
      cuisine: text(cells.getCell(cols.cuisine).value),
      address: text(cells.getCell(cols.address).value),
      zone: text(cells.getCell(cols.zone).value),
      segment: text(cells.getCell(cols.segment).value),
      cartas: text(cells.getCell(cols.cartas).value),
      dailyMenu: text(cells.getCell(cols.dailyMenu).value),
      menuPrice: text(cells.getCell(cols.menuPrice).value),
      cartaRange: text(cells.getCell(cols.cartaRange).value),
      phone,
      schedule: text(cells.getCell(cols.schedule).value),
      ownDelivery: text(cells.getCell(cols.ownDelivery).value),
      platform: text(cells.getCell(cols.platform).value),
      priority: text(cells.getCell(cols.priority).value),
      source: text(cells.getCell(cols.source).value),
      lat: cols.lat ? num(cells.getCell(cols.lat).value) || undefined : undefined,
      lng: cols.lng ? num(cells.getCell(cols.lng).value) || undefined : undefined,
    });
  }
  return restaurants;
}

function readCouriers(workbook: ExcelJS.Workbook): ComeyaCourier[] {
  const sheet = sheetByName(workbook, '09C_Registro_Repartidores');
  if (!sheet) return [];
  const headerRow = findHeaderRow(sheet, 'NOMBRES Y APELLIDOS');
  if (!headerRow) return [];
  const at = columnIndex(sheet, headerRow);
  const cols = {
    name: at('NOMBRES Y APELLIDOS'),
    dni: at('DNI'),
    phone: at('CELULAR / WHATSAPP'),
    vehicle: at('TIPO DE VEHÍCULO', 'TIPO DE VEHICULO'),
    plate: at('PLACA'),
    zones: at('ZONAS DONDE PUEDE REPARTIR', 'ZONA DE PUNO'),
    shift: at('DISPONIBILIDAD'),
    license: at('LICENCIA DE CONDUCIR'),
    soat: at('SOAT VIGENTE'),
    status: at('ESTADO'),
    source: at('CÓMO SE ENTERÓ', 'COMO SE ENTERO'),
    lat: at('LATITUD BASE'),
    lng: at('LONGITUD BASE'),
  };
  if (!cols.name) return [];
  const couriers: ComeyaCourier[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    const cells = sheet.getRow(row);
    const name = text(cells.getCell(cols.name).value);
    if (!name || isTemplateRow(name)) continue;
    couriers.push({
      name,
      dni: text(cells.getCell(cols.dni).value),
      phone: text(cells.getCell(cols.phone).value),
      vehicle: text(cells.getCell(cols.vehicle).value),
      plate: text(cells.getCell(cols.plate).value),
      zones: text(cells.getCell(cols.zones).value),
      shift: text(cells.getCell(cols.shift).value),
      license: text(cells.getCell(cols.license).value),
      soat: text(cells.getCell(cols.soat).value),
      status: text(cells.getCell(cols.status).value),
      source: text(cells.getCell(cols.source).value),
      lat: cols.lat ? num(cells.getCell(cols.lat).value) || undefined : undefined,
      lng: cols.lng ? num(cells.getCell(cols.lng).value) || undefined : undefined,
    });
  }
  return couriers;
}

function readCompanies(workbook: ExcelJS.Workbook): DeliveryCompany[] {
  const sheet = sheetByName(workbook, '09B_Empresas_Reparto_Taxi');
  if (!sheet) return [];
  const headerRow = findHeaderRow(sheet, 'NOMBRE / RAZÓN SOCIAL') || findHeaderRow(sheet, 'NOMBRE / RAZON SOCIAL');
  if (!headerRow) return [];
  const at = columnIndex(sheet, headerRow);
  const cols = {
    name: at('NOMBRE / RAZÓN SOCIAL', 'NOMBRE / RAZON SOCIAL'),
    type: at('TIPO'),
    service: at('SERVICIO'),
    phone: at('CELULAR / WHATSAPP', 'TELÉFONO FIJO', 'TELEFONO FIJO'),
    address: at('DIRECCIÓN', 'DIRECCION'),
    zone: at('ZONA'),
    units: at('N° UNIDADES (aprox)', 'N° UNIDADES'),
    interested: at('¿INTERESADO EN COMEYA?'),
    contactState: at('ESTADO DE CONTACTO'),
    source: at('FUENTE / OBSERVACIÓN', 'FUENTE / OBSERVACION'),
    lat: at('LATITUD'),
    lng: at('LONGITUD'),
  };
  if (!cols.name) return [];
  const companies: DeliveryCompany[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    const cells = sheet.getRow(row);
    const name = text(cells.getCell(cols.name).value);
    if (!name || isTemplateRow(name)) continue;
    companies.push({
      name,
      type: text(cells.getCell(cols.type).value),
      service: text(cells.getCell(cols.service).value),
      phone: text(cells.getCell(cols.phone).value),
      address: text(cells.getCell(cols.address).value),
      zone: text(cells.getCell(cols.zone).value),
      units: text(cells.getCell(cols.units).value),
      interested: text(cells.getCell(cols.interested).value),
      contactState: text(cells.getCell(cols.contactState).value),
      lat: cols.lat ? num(cells.getCell(cols.lat).value) || undefined : undefined,
      lng: cols.lng ? num(cells.getCell(cols.lng).value) || undefined : undefined,
      source: text(cells.getCell(cols.source).value),
    });
  }
  return companies;
}

function readZones(workbook: ExcelJS.Workbook): DeliveryZone[] {
  const sheet = sheetByName(workbook, '99_Listas');
  if (!sheet) return [];
  const headerRow = findHeaderRow(sheet, 'ZONA DE PUNO') || 1;
  const at = columnIndex(sheet, headerRow);
  const zoneCol = at('ZONA DE PUNO');
  const feeCol = at('TARIFA DELIVERY S/');
  if (!zoneCol || !feeCol) return [];
  const zones: DeliveryZone[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
    const cells = sheet.getRow(row);
    const zone = text(cells.getCell(zoneCol).value);
    const fee = num(cells.getCell(feeCol).value);
    if (!zone || !fee) continue;
    zones.push({ zone, fee });
  }
  return zones;
}

function readVersion(workbook: ExcelJS.Workbook): string {
  const sheet = sheetByName(workbook, '00_LEEME');
  if (!sheet) return '';
  for (let row = 1; row <= Math.min(sheet.rowCount, 6); row++) {
    const values = sheet.getRow(row).values as ExcelJS.CellValue[];
    const line = values?.map(cell => text(cell)).find(value => /versi[oó]n/i.test(value));
    if (line) return line;
  }
  return '';
}

export async function importComeyaWorkbook(file: File): Promise<ComeyaDataset> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  return {
    version: readVersion(workbook),
    fileName: file.name,
    importedAt: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
    products: readProducts(workbook),
    restaurants: readRestaurants(workbook),
    couriers: readCouriers(workbook),
    companies: readCompanies(workbook),
    zones: readZones(workbook),
    sheetsFound: workbook.worksheets.map(sheet => sheet.name),
  };
}
