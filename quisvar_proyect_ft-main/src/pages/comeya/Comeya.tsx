import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Bike, Check, Clock3, MapPin, Minus, Package, Plus, Search, ShoppingBag, Store, Users, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axiosInstance } from '@/services/axiosInstance';
import { cartaProductsTotal, cartaSummary, cartaTheme, categoryEmoji, categoryPhotos, categoryToCarta, comboIdeas, commissionSegments, deliveryZones, topConsumedByCarta } from './comeyaMarketData';
import { type FullCatalogProduct } from './comeyaFullCatalog';
import { restaurantSegments, restaurantTypes, restaurantZones, type ComeyaRestaurant } from './comeyaRestaurants';
import { courierShifts, courierSources, courierStatuses, courierVehicles, type ComeyaCourier } from './comeyaCouriers';
import { importComeyaWorkbook } from './comeyaExcelImport';
import { clearDataset, saveDataset, useComeyaDataset } from './comeyaDataset';
import { deleteFile, downloadFile, listFiles, saveFile, type StoredFile } from './comeyaFileStore';
import { OrderMarginSimulator } from './OrderMarginSimulator';

type Role = 'admin' | 'restaurant' | 'driver' | 'client';
type Status = 'Nuevo' | 'Preparando' | 'En camino' | 'Entregado';
type AdminSection = 'Resumen' | 'Pedidos' | 'Restaurantes' | 'Repartidores' | 'Clientes' | 'Mensajes y soporte' | 'Menú' | 'Promociones' | 'Finanzas' | 'Cobertura' | 'Reclamos' | 'Reportes' | 'Configuración';

type Order = {
  id: string;
  customer: string;
  restaurant: string;
  status: Status;
  courier: string;
  total: string;
};

type Tone = 'green' | 'amber' | 'blue' | 'coral' | 'neutral';

const orders: Order[] = [
  { id: 'CY-1048', customer: 'Valeria Mendoza', restaurant: 'La Brasa de Don Pepe', status: 'Preparando', courier: 'Luis Ramírez', total: 'S/ 48.90' },
  { id: 'CY-1047', customer: 'Diego Rodríguez', restaurant: 'Sazón Criollo', status: 'En camino', courier: 'Carlos Torres', total: 'S/ 36.50' },
  { id: 'CY-1046', customer: 'Camila García', restaurant: 'La Brasa de Don Pepe', status: 'Nuevo', courier: 'Por asignar', total: 'S/ 62.90' },
  { id: 'CY-1045', customer: 'Andrea Flores', restaurant: 'Verde & Fresco', status: 'En camino', courier: 'María López', total: 'S/ 29.90' },
  { id: 'CY-1044', customer: 'José Castillo', restaurant: 'Sazón Criollo', status: 'Entregado', courier: 'Luis Ramírez', total: 'S/ 42.50' },
];

const customerRestaurants = [
  { name: 'La Brasa de Don Pepe', category: 'Criollo', detail: 'Pollo a la brasa · 25–35 min', emoji: '🍗', price: 48.9 },
  { name: 'Verde & Fresco', category: 'Saludable', detail: 'Ensaladas y bowls · 20–30 min', emoji: '🥗', price: 29.9 },
  { name: 'Sazón Criollo', category: 'Criollo', detail: 'Comida peruana · 30–40 min', emoji: '🍲', price: 36.5 },
];

const adminModules = [
  ['Pedidos', 'Supervisa estados y asignaciones.', '5 pendientes', 'Abrir pedidos'],
  ['Restaurantes', 'Administra comercios y horarios.', '3 afiliados', 'Ver restaurantes'],
  ['Repartidores', 'Controla rutas y entregas.', '3 conectados', 'Ver repartidores'],
  ['Clientes', 'Consulta usuarios y direcciones.', '128 activos', 'Ver clientes'],
  ['Menú', 'Gestiona productos y categorías.', '54 publicados', 'Administrar menú'],
  ['Promociones', 'Configura cupones y campañas.', '2 vigentes', 'Ver promociones'],
  ['Finanzas', 'Revisa ventas y liquidaciones.', 'S/ 4,966 por liquidar', 'Ver finanzas'],
  ['Cobertura', 'Define zonas y tarifas.', '3 zonas activas', 'Editar cobertura'],
  ['Reclamos', 'Da seguimiento a incidencias.', '2 abiertos', 'Ver reclamos'],
  ['Reportes', 'Consulta rendimiento por periodo.', '3 reportes listos', 'Generar reporte'],
  ['Configuración', 'Administra accesos y alertas.', '3 administradores', 'Abrir configuración'],
];

const driverModules = [
  ['Mis entregas', 'Pedidos asignados, recogidos y entregados.', '12 hoy', 'Ver entregas'],
  ['Rutas y zonas', 'Consulta recorridos y zonas habilitadas.', 'Miraflores · San Isidro', 'Ver mapa'],
  ['Ganancias', 'Liquidaciones, comisiones y pagos.', 'S/ 86.40 hoy', 'Ver ganancias'],
  ['Disponibilidad', 'Define tus horarios de conexión.', 'Disponible ahora', 'Configurar horario'],
  ['Perfil y documentos', 'Identidad, licencia y vehículo.', 'Vigentes', 'Ver perfil'],
  ['Ayuda y soporte', 'Reporta incidencias de una entrega.', 'Canal disponible', 'Solicitar ayuda'],
];

const adminDetailRows: Partial<Record<AdminSection, string[][]>> = {
  Clientes: [['Valeria Mendoza', 'valeria@email.com · Miraflores', '12 pedidos', 'Ver perfil'], ['Diego Rodríguez', 'diego@email.com · San Isidro', '8 pedidos', 'Ver perfil'], ['Camila García', 'camila@email.com · Surquillo', '5 pedidos', 'Ver perfil']],
  Promociones: [['BIENVENIDA10', 'Primera compra · 10% de descuento', 'Vigente', 'Editar'], ['ENVIOGRATIS', 'Pedidos desde S/ 50', 'Vigente', 'Editar'], ['Nueva promoción', 'Campaña pendiente de configurar', 'Borrador', 'Crear']],
  Finanzas: [['Ventas del periodo', 'Ingresos y pedidos procesados', 'S/ 5,842', 'Ver detalle'], ['Comisiones', 'Tasa configurada: 15%', 'S/ 876', 'Ver detalle'], ['Liquidaciones', 'Pagos a restaurantes', 'Pendiente', 'Revisar']],
  Cobertura: [['Miraflores', 'Alta demanda · 3 restaurantes', 'S/ 4.90 · 25 min', 'Editar'], ['San Isidro', 'Demanda media · 2 restaurantes', 'S/ 5.90 · 30 min', 'Editar'], ['Surquillo', 'Demanda media · 1 restaurante', 'S/ 3.90 · 20 min', 'Editar']],
  Reclamos: [['#RC-203', 'Camila García · Cobro duplicado', 'En revisión', 'Atender'], ['#RC-202', 'José Castillo · Pedido incompleto', 'Resuelto', 'Ver detalle']],
  Reportes: [['Ventas por día', 'Ingresos y pedidos procesados', 'Listo', 'Descargar'], ['Entregas y tiempos', 'Cumplimiento por repartidor', 'Listo', 'Descargar'], ['Comisiones', 'Liquidación de restaurantes', 'Pendiente', 'Generar']],
  Configuración: [['Datos del negocio', 'ComeYa Perú · RUC 20601234567', 'Configurado', 'Editar'], ['Usuarios y permisos', '3 administradores activos', 'Activo', 'Gestionar'], ['Notificaciones', 'Email y alertas operativas', 'Activo', 'Configurar'], ['Registro de archivos fuente', 'Almacenamiento de datos que alimenta el programa', 'Cargado', 'Ver registro']],
};

const roleLabels: Record<Role, string> = { admin: 'Administrador', restaurant: 'Restaurante', driver: 'Repartidor', client: 'Cliente' };
const badgeStyles: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
  coral: 'bg-orange-50 text-orange-700',
  neutral: 'bg-muted text-muted-foreground',
};

const toneFor = (value: string): Tone => {
  if (value === 'Activo' || value === 'Entregado' || value === 'Disponible ahora' || value === 'Vigentes' || value === 'Vigente') return 'green';
  if (value === 'Preparando' || value === 'Revisión' || value === 'Pendiente') return 'amber';
  if (value === 'En camino' || value === 'Activa') return 'blue';
  if (value === 'Nuevo') return 'coral';
  return 'neutral';
};

const sidebarItems: Record<Role, string[]> = {
  admin: ['Resumen', 'Pedidos', 'Restaurantes', 'Repartidores', 'Clientes', 'Mensajes y soporte', 'Menú', 'Promociones', 'Finanzas', 'Cobertura', 'Reclamos', 'Reportes', 'Configuración'],
  restaurant: ['Pedidos', 'Chat y contacto', 'Menú', 'Horarios', 'Finanzas y pagos', 'Promociones', 'Perfil y documentos', 'Registro'],
  driver: ['Mis entregas', 'Chat y contacto', 'Rutas y zonas', 'Ganancias', 'Disponibilidad', 'Perfil y documentos', 'Ayuda y soporte', 'Registro'],
  client: [],
};

let currentComeyaSection = 'Pedidos';
let setActiveComeyaSection: ((section: string) => void) | null = null;

const comeyaResponsiveCss = [
  '.comeya-shell { display: flex; height: 100vh; min-height: 100vh; overflow: hidden; }',
  '.comeya-sidebar { width: 208px; height: 100vh; flex: 0 0 208px; overflow-y: auto; }',
  '.comeya-sidebar .comeya-wordmark { display: none; }',
  '.comeya-sidebar .comeya-workspace { margin-top: 0 !important; }',
  '.comeya-content { min-width: 0; height: 100vh; flex: 1 1 auto; overflow-y: scroll; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: #94a3b8 transparent; padding: 24px; }',
  '.comeya-content::-webkit-scrollbar { width: 10px; }',
  '.comeya-content::-webkit-scrollbar-track { background: transparent; }',
  '.comeya-content::-webkit-scrollbar-thumb { border: 3px solid transparent; border-radius: 999px; background: #94a3b8; background-clip: content-box; }',
  '.comeya-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: nowrap; text-align: left; }',
  '.comeya-list-head, .comeya-list-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 16px; }',
  '.comeya-list-head { border-bottom: 1px solid #dbe3ec; background: rgba(148, 163, 184, .08); padding: 8px 20px; }',
  '.comeya-list-row { padding: 12px 20px; }',
  '@media (max-width: 900px) { .comeya-content { padding: 16px; } .comeya-header { flex-wrap: wrap; } .comeya-list-head, .comeya-list-row { grid-template-columns: minmax(0, 1fr) auto; } .comeya-list-head span:nth-child(3), .comeya-list-row > :nth-child(3) { display: none; } }',
  '@media (max-width: 640px) { .comeya-sidebar { width: 154px; flex-basis: 154px; padding-left: 8px; padding-right: 8px; } .comeya-workspace { padding: 8px; } .comeya-sidebar nav button { padding-left: 8px; padding-right: 8px; font-size: 12px; } .comeya-content { padding: 12px; } .comeya-header { align-items: flex-start; flex-direction: column; } .comeya-role-switcher { justify-content: flex-start; } .comeya-list-head { display: none; } .comeya-list-row { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; } .comeya-list-row > :nth-child(3) { display: block; grid-column: 1 / -1; grid-row: 2; } .comeya-list-row > :nth-child(4) { grid-column: 2; grid-row: 1; } }',
].join('');

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={'inline-flex justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold ' + badgeStyles[tone]}>{children}</span>;
}

function RoleSwitcher({ role, onChange, compact = false }: { role: Role; onChange: (value: Role) => void; compact?: boolean }) {
  const layout = compact ? 'grid w-full grid-cols-2 gap-1.5' : 'flex shrink-0 flex-wrap justify-end gap-2';
  const buttonSize = compact ? 'min-w-0 px-1.5 py-1.5 text-[10px]' : 'px-3 py-2 text-xs';
  return <div className={layout}>{(Object.keys(roleLabels) as Role[]).map((item) => <button key={item} type="button" onClick={() => onChange(item)} className={'rounded-md font-medium transition ' + buttonSize + ' ' + (role === item ? 'bg-orange-100 text-orange-700' : 'bg-muted/70 text-muted-foreground hover:bg-orange-50 hover:text-orange-700')}>{roleLabels[item]}</button>)}</div>;
}

function ComeyaBrand() {
  return <div className="flex shrink-0 items-center gap-2 text-2xl font-bold text-foreground"><span className="inline-grid size-9 place-items-center rounded-lg bg-orange-600 text-white">c</span><span>Come<span className="text-orange-600">Ya</span></span></div>;
}

function ComeyaSidebar({ role, activeSection, onNotice, onSelect, onRoleChange }: { role: Role; activeSection: string; onNotice: (message: string) => void; onSelect: (item: string) => void; onRoleChange: (role: Role) => void }) {
  return <aside className="comeya-sidebar flex min-h-screen w-52 shrink-0 flex-col border-r bg-background px-4 py-5">
    <div className="comeya-wordmark text-2xl font-bold text-foreground"><span className="mr-2 inline-grid size-9 place-items-center rounded-lg bg-orange-600 text-white">c</span><span className="comeya-wordmark-text">Come<span className="text-orange-600">Ya</span></span></div>
    <div className="comeya-workspace mt-5 px-1">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cambiar panel</p>
        <RoleSwitcher role={role} onChange={onRoleChange} compact />
      </div>
    </div>
    {sidebarItems[role].length > 0 && <><p className="comeya-section-title mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operación</p>
    <nav className="mt-2 flex flex-col gap-1">{sidebarItems[role].map((item) => { const active = item === activeSection || item === currentComeyaSection; return <button key={item} type="button" onClick={() => { currentComeyaSection = item; setActiveComeyaSection?.(item); window.dispatchEvent(new CustomEvent('comeya-section', { detail: item })); onSelect(item); onNotice(item + ' seleccionado.'); }} className={'comeya-nav-button flex items-center rounded-md px-3 py-2.5 text-left text-sm transition ' + (active ? 'bg-orange-50 font-semibold text-orange-700' : 'text-foreground hover:bg-muted')}><span className="comeya-nav-label">{item}</span></button>; })}</nav></>}
  </aside>;
}

function ModuleList({ title, description, rows, onAction }: { title: string; description: string; rows: string[][]; onAction: (name: string) => void }) {
  return <section className="rounded-lg border bg-background shadow-sm"><div className="border-b p-5"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="comeya-list-head grid grid-cols-1 gap-2 border-b bg-muted/30 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-2 lg:grid-cols-4"><span>Elemento</span><span>Estado</span><span>Actualización</span><span /></div><div className="divide-y">{rows.map(([name, detail, state, action]) => <div key={name} className="comeya-list-row grid grid-cols-1 items-center gap-3 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4"><div className="min-w-0"><p className="font-semibold">{name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></div><Badge tone={toneFor(state)}>{state}</Badge><span className="whitespace-nowrap text-xs text-muted-foreground">Actualizado hoy</span><button type="button" onClick={() => onAction(name)} className="whitespace-nowrap text-sm font-semibold text-primary hover:underline lg:justify-self-end">{action} <ArrowRight className="ml-1 inline size-4" /></button></div>)}</div></section>;
}

function MarketSummary() {
  return <section id="resumen-mercado" className="scroll-mt-24 rounded-lg border bg-background p-5 shadow-sm">
    <h3 className="font-semibold">Resumen del mercado gastronómico de Puno</h3>
    <p className="mt-1 text-sm text-muted-foreground">{cartaProductsTotal} productos relevados en 7 cartas. Precio promedio por carta (S/):</p>
    <div className="mt-4 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cartaSummary.map(item => ({ name: item.label, avg: item.avgPrice }))} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => 'S/ ' + Number(value).toFixed(2)} />
          <Bar dataKey="avg" fill="#e34b2e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cartaSummary.map(item => <div key={item.key} id={'carta-' + item.key} className="scroll-mt-24 rounded-md bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-semibold">{item.products} productos</p><p className="text-xs text-muted-foreground">S/ {item.minPrice}–{item.maxPrice}</p></div>)}
    </div>
  </section>;
}

const emptyCartaProductForm: FullCatalogProduct = { category: '', name: '', description: '', ingredients: '', portion: '', segment: '', priceMin: 0, priceMax: 0, pricePromedio: 0, peakHour: '', prepMinutes: 0, deliverySuitability: '', localType: '', note: '', photoUrl: '' };

const emptyRestaurantForm: ComeyaRestaurant = { name: '', localType: '', cuisine: '', address: '', zone: '', segment: '', cartas: '', dailyMenu: '', menuPrice: '', cartaRange: '', phone: '', schedule: '', ownDelivery: '', platform: '', priority: '', source: '' };

const emptyCourierForm: ComeyaCourier = { name: '', dni: '', phone: '', vehicle: '', plate: '', zones: '', shift: '', license: '', soat: '', status: '', source: '' };

type DataSourceState = 'Cargado' | 'Enlazado' | 'Pendiente';
type DataSource = { id: string; file: string; sheets: string; feeds: string; target: string; records: string; state: DataSourceState };
type SourceUpload = { fileName: string; size: number; uploadedAt: string; modifiedAt: string };

const emptyDataSource: DataSource = { id: '', file: '', sheets: '', feeds: '', target: '', records: '', state: 'Pendiente' };

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

const dataSourceStates: DataSourceState[] = ['Cargado', 'Enlazado', 'Pendiente'];

const formatFileSize = (bytes: number) => bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';

const dataSources: DataSource[] = [
  { id: 'restaurantes', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_2.xlsx', sheets: '08_Restaurantes', feeds: 'Padrón de restaurantes de Puno: tipo, cocina, dirección, zona, segmento y cartas', target: 'comeyaRestaurants.ts → restaurantDirectory', records: '50 locales · 16 campos', state: 'Cargado' },
  { id: 'catalogo', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_1.xlsx', sheets: '98_Catalogo', feeds: 'Ficha completa de producto de las 7 cartas: ingredientes, porción, precios, hora pico', target: 'comeyaFullCatalog.ts → fullCatalogByCarta', records: '787 productos · 14 campos', state: 'Cargado' },
  { id: 'top-consumidos', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_1.xlsx', sheets: '98_Catalogo · columna OBSERVACIÓN COMERCIAL', feeds: 'Los 3 más consumidos por carta (productos marcados como ancla o de mayor rotación)', target: 'comeyaMarketData.ts → topConsumedByCarta', records: '21 productos · 7 cartas', state: 'Cargado' },
  { id: 'listas', file: 'ComeYa_Base_Datos_Mercado_Puno_v4.xlsx', sheets: '99_Listas', feeds: 'Zonas de reparto con su tarifa, % de comisión por segmento y tipos de local', target: 'comeyaMarketData.ts → deliveryZones, commissionSegments', records: '15 zonas · 4 segmentos', state: 'Cargado' },
  { id: 'simulador', file: 'ComeYa_Base_Datos_Mercado_Puno_v4.xlsx', sheets: '11_Simulador_Pedido', feeds: 'Simulador de margen por pedido (ticket, comisión, tarifa y neto del restaurante)', target: 'OrderMarginSimulator.tsx → orderSimulatorDefaults', records: '1 modelo de cálculo', state: 'Cargado' },
  { id: 'resumen', file: 'ComeYa_Base_Datos_Mercado_Puno_v4.xlsx', sheets: '12_Resumen', feeds: 'Resumen por carta: nº de productos, precio promedio, mínimo, máximo y comisión', target: 'comeyaMarketData.ts → cartaSummary', records: '7 cartas · 787 productos', state: 'Cargado' },
  { id: 'seed-backend', file: 'ComeYa_Base_Datos_Mercado_Puno_v4.xlsx', sheets: '01_Desayunos a 07_Licorerias', feeds: 'Semilla del catálogo en la base de datos del backend (Prisma)', target: 'quisvar_proyect_bk-main → comeyaCatalogSeed.ts', records: '787 filas · 47 categorías', state: 'Cargado' },
  { id: 'competencia', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_2.xlsx', sheets: '09_Delivery_Competencia', feeds: 'Turnos, canales de captación de repartidores y lectura de la competencia local', target: 'comeyaCouriers.ts → courierShifts, courierSources', records: '11 competidores', state: 'Cargado' },
  { id: 'fotos', file: 'Librería de fotos ComeYa · public/comeya-fotos/', sheets: 'Origen: Wikimedia Commons (CC0, dominio público, CC-BY, CC-BY-SA)', feeds: 'Fotos de producto por categoría, descargadas y guardadas en el proyecto', target: 'comeyaMarketData.ts → categoryPhotos, categoryPhotoCredits', records: '186 archivos · 11.4 MB · 47 categorías', state: 'Cargado' },
  { id: 'contexto-zona', file: 'Redacción propia sobre Puno (no proviene del Excel)', sheets: '—', feeds: 'Contexto de la zona por carta: altitud, clima, mercados, festividades y normativa', target: 'comeyaMarketData.ts → cartaSummary.zoneContext', records: '7 descripciones', state: 'Cargado' },
  { id: 'ficha-campo', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_2.xlsx', sheets: '10_Ficha_Campo', feeds: 'Levantamiento en campo: teléfono, horario, menú diario, producto más vendido y unidades/día', target: 'Formularios de Restaurantes y Repartidores', records: '0 de 300 filas levantadas', state: 'Pendiente' },
  { id: 'buscador', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_2.xlsx', sheets: '13_Buscador', feeds: 'Buscador del Excel: no se carga, el buscador de la app trabaja sobre el catálogo', target: 'Sin consumir', records: '—', state: 'Pendiente' },
  { id: 'leeme', file: 'ComeYa_Base_Datos_Mercado_Puno_v5_2.xlsx', sheets: '00_LEEME', feeds: 'Instrucciones y criterios del relevamiento: documentación, no se carga al programa', target: 'Sin consumir', records: '—', state: 'Pendiente' },
];

function pickCategoryPhoto(category: string, name: string) {
  const photos = categoryPhotos[category];
  if (!photos || photos.length === 0) return undefined;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return photos[hash % photos.length];
}

function ProductPhoto({ product }: { product: FullCatalogProduct }) {
  const [failed, setFailed] = useState(false);
  const src = product.photoUrl || pickCategoryPhoto(product.category, product.name || product.category);
  if (!src || failed) {
    return <div className={'relative grid h-28 place-items-center overflow-hidden rounded-md bg-gradient-to-br ' + (cartaTheme[categoryToCarta[product.category]] ?? 'from-orange-100 to-rose-100')}>
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #7c2d12 0px, #7c2d12 2px, transparent 2px, transparent 14px)' }} aria-hidden="true" />
      <div className="relative grid size-20 place-items-center rounded-full bg-white/60 text-5xl shadow-inner ring-1 ring-white/80">{categoryEmoji[product.category] ?? '🍽️'}</div>
    </div>;
  }
  return <div className="h-28 overflow-hidden rounded-md bg-muted"><img src={src} alt={product.name || product.category} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" /></div>;
}

function AdminDetailView({ section, notice, selectedCarta }: { section: AdminSection; notice: (message: string) => void; selectedCarta?: string | null }) {
  const [addedRestaurants, setAddedRestaurants] = useState<ComeyaRestaurant[]>([]);
  const [showRestaurantForm, setShowRestaurantForm] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState<ComeyaRestaurant>(emptyRestaurantForm);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantZone, setRestaurantZone] = useState('Todas');
  const { dataset, catalogByCarta, restaurants: directoryRestaurants, zones: activeZones, couriers: importedCouriers } = useComeyaDataset();
  const [importing, setImporting] = useState(false);
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [sourceUploads, setSourceUploads] = useState<Record<string, SourceUpload>>(() => readLocalJson('comeya.source-uploads.v1', {}));
  const [extraSources, setExtraSources] = useState<DataSource[]>(() => readLocalJson('comeya.extra-sources.v1', []));
  const [sourceEdits, setSourceEdits] = useState<Record<string, Partial<DataSource>>>(() => readLocalJson('comeya.source-edits.v1', {}));
  const [removedSources, setRemovedSources] = useState<string[]>(() => readLocalJson('comeya.removed-sources.v1', []));
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DataSource | null>(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceForm, setSourceForm] = useState<DataSource>(emptyDataSource);
  const [newSourceFile, setNewSourceFile] = useState<File | null>(null);
  const [couriers, setCouriers] = useState<ComeyaCourier[]>([]);
  const [showCourierForm, setShowCourierForm] = useState(false);
  const [courierForm, setCourierForm] = useState<ComeyaCourier>(emptyCourierForm);
  const [courierSearch, setCourierSearch] = useState('');
  const [courierZone, setCourierZone] = useState('Todas');
  const [addedByCarta, setAddedByCarta] = useState<Record<string, FullCatalogProduct[]>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<FullCatalogProduct>(emptyCartaProductForm);
  const [formCarta, setFormCarta] = useState(cartaSummary[0].label);
  const setField = <K extends keyof FullCatalogProduct>(key: K, value: FullCatalogProduct[K]) => setForm(current => ({ ...current, [key]: value }));
  const applyAsModel = (product: FullCatalogProduct) => { setForm(product); setShowAddForm(true); };
  const registerProduct = (targetCarta: string) => {
    if (!form.name.trim() || !form.category.trim()) { notice('Ingresa al menos categoría y producto.'); return; }
    setAddedByCarta(current => ({ ...current, [targetCarta]: [form, ...(current[targetCarta] ?? [])] }));
    notice(form.name + ' registrado en ' + targetCarta + '.');
    setForm(emptyCartaProductForm);
    setShowAddForm(false);
  };
  const setRestaurantField = <K extends keyof ComeyaRestaurant>(key: K, value: ComeyaRestaurant[K]) => setRestaurantForm(current => ({ ...current, [key]: value }));
  const registerRestaurant = () => {
    if (!restaurantForm.name.trim()) { notice('Ingresa al menos el nombre del local.'); return; }
    setAddedRestaurants(current => [restaurantForm, ...current]);
    notice(restaurantForm.name + ' registrado en el padrón.');
    setRestaurantForm(emptyRestaurantForm);
    setShowRestaurantForm(false);
  };
  const registerUpload = async (key: string, file: File) => {
    setSourceUploads(current => ({ ...current, [key]: {
      fileName: file.name,
      size: file.size,
      uploadedAt: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
      modifiedAt: new Date(file.lastModified).toLocaleDateString('es-PE'),
    } }));
    try {
      await saveFile(key, file);
      setStoredFiles(await listFiles());
    } catch {
      notice('El archivo se registró, pero el navegador no permitió guardarlo completo.');
    }
    if (!/\.xlsx$/i.test(file.name)) { notice(file.name + ' quedó registrado en el almacenamiento de datos.'); return; }
    setImporting(true);
    try {
      const imported = await importComeyaWorkbook(file);
      const counts = [
        imported.products.length ? imported.products.length + ' productos' : '',
        imported.restaurants.length ? imported.restaurants.length + ' restaurantes' : '',
        imported.couriers.length ? imported.couriers.length + ' repartidores' : '',
        imported.companies.length ? imported.companies.length + ' empresas de reparto' : '',
        imported.zones.length ? imported.zones.length + ' zonas' : '',
      ].filter(Boolean);
      if (!counts.length) { notice(file.name + ' se registró, pero no se reconocieron hojas de datos de ComeYa.'); return; }
      saveDataset(imported);
      notice('Programa actualizado desde ' + file.name + ': ' + counts.join(' · ') + '.');
    } catch {
      notice('No se pudo leer ' + file.name + '. Verifica que sea el Excel de mercado de ComeYa.');
    } finally {
      setImporting(false);
    }
  };
  const registerNewSource = async () => {
    if (!sourceForm.file.trim()) { notice('Ingresa el nombre del archivo.'); return; }
    const item: DataSource = {
      ...sourceForm,
      id: 'fuente-' + Date.now(),
      file: sourceForm.file.trim(),
      sheets: sourceForm.sheets.trim() || '—',
      feeds: sourceForm.feeds.trim() || 'Por definir',
      target: sourceForm.target.trim() || 'Sin procesar',
      records: sourceForm.records.trim() || 'Por procesar',
    };
    setExtraSources(current => [item, ...current]);
    const attached = newSourceFile;
    setSourceForm(emptyDataSource);
    setNewSourceFile(null);
    setShowSourceForm(false);
    if (attached) await registerUpload(item.id, attached);
    else notice(item.file + ' agregado al registro. Súbelo desde Editar.');
  };
  useEffect(() => {
    try { window.localStorage.setItem('comeya.source-uploads.v1', JSON.stringify(sourceUploads)); } catch { /* cuota llena */ }
  }, [sourceUploads]);
  useEffect(() => {
    try { window.localStorage.setItem('comeya.extra-sources.v1', JSON.stringify(extraSources)); } catch { /* cuota llena */ }
  }, [extraSources]);
  useEffect(() => {
    try { window.localStorage.setItem('comeya.source-edits.v1', JSON.stringify(sourceEdits)); } catch { /* cuota llena */ }
  }, [sourceEdits]);
  useEffect(() => {
    try { window.localStorage.setItem('comeya.removed-sources.v1', JSON.stringify(removedSources)); } catch { /* cuota llena */ }
  }, [removedSources]);
  useEffect(() => {
    listFiles().then(setStoredFiles).catch(() => undefined);
  }, []);
  const renderSourceFields = (draft: DataSource, update: (patch: Partial<DataSource>) => void) => <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <label className="text-sm font-medium sm:col-span-2">Archivo<input value={draft.file} onChange={event => update({ file: event.target.value })} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. ComeYa_Base_Datos_Mercado_Puno_v9.xlsx" /></label>
    <label className="text-sm font-medium">Hojas<input value={draft.sheets} onChange={event => update({ sheets: event.target.value })} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. 08_Restaurantes" /></label>
    <label className="text-sm font-medium">Registros<input value={draft.records} onChange={event => update({ records: event.target.value })} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. 193 locales" /></label>
    <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Alimenta<input value={draft.feeds} onChange={event => update({ feeds: event.target.value })} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Padrón de restaurantes de Puno" /></label>
    <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Destino en el código<input value={draft.target} onChange={event => update({ target: event.target.value })} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. comeyaRestaurants.ts → restaurantDirectory" /></label>
    <label className="text-sm font-medium">Estado<select value={draft.state} onChange={event => update({ state: event.target.value as DataSourceState })} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal">{dataSourceStates.map(state => <option key={state} value={state}>{state}</option>)}</select></label>
  </div>;
  const openSourceEditor = (item: DataSource) => { setEditDraft(item); setEditingSource(item.id); };
  const saveSourceEdit = () => {
    if (!editDraft) return;
    const { id, ...patch } = editDraft;
    setSourceEdits(current => ({ ...current, [id]: patch }));
    notice(editDraft.file + ' actualizado en el registro.');
    setEditingSource(null);
    setEditDraft(null);
  };
  const deleteSource = async (item: DataSource) => {
    setSourceUploads(current => { const copy = { ...current }; delete copy[item.id]; return copy; });
    await deleteFile(item.id).catch(() => undefined);
    setStoredFiles(await listFiles());
    setExtraSources(current => current.filter(source => source.id !== item.id));
    setRemovedSources(current => [...current, item.id]);
    notice(item.file + ' eliminado del registro.');
    setEditingSource(null);
    setEditDraft(null);
  };
  const clearSourceUpload = async (item: DataSource) => {
    setSourceUploads(current => { const copy = { ...current }; delete copy[item.id]; return copy; });
    await deleteFile(item.id).catch(() => undefined);
    setStoredFiles(await listFiles());
    notice('Archivo cargado de ' + item.file + ' quitado.');
    setEditingSource(null);
    setEditDraft(null);
  };
  const setCourierField = <K extends keyof ComeyaCourier>(key: K, value: ComeyaCourier[K]) => setCourierForm(current => ({ ...current, [key]: value }));
  const registerCourier = () => {
    if (!courierForm.name.trim() || !courierForm.phone.trim()) { notice('Ingresa al menos nombre y teléfono del repartidor.'); return; }
    setCouriers(current => [courierForm, ...current]);
    notice(courierForm.name + ' registrado como repartidor.');
    setCourierForm(emptyCourierForm);
    setShowCourierForm(false);
  };
  const renderAddForm = (targetCarta: string, modelProducts: FullCatalogProduct[], categoryOptions: string[]) => <section className="rounded-lg border bg-background p-5 shadow-sm">
    <label className="text-sm font-medium">Usar un producto de {targetCarta} como modelo
      <select defaultValue="" onChange={event => { const match = modelProducts.find(item => item.name === event.target.value); if (match) applyAsModel(match); }} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal">
        <option value="" disabled>Selecciona un producto modelo (opcional)</option>
        {modelProducts.map(item => <option key={item.category + item.name} value={item.name}>{item.name} · {item.category}</option>)}
      </select>
    </label>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="text-sm font-medium">Categoría<input list="carta-categorias" value={form.category} onChange={event => setField('category', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Caldos de mañana" /><datalist id="carta-categorias">{categoryOptions.map(item => <option key={item} value={item} />)}</datalist></label>
      <label className="text-sm font-medium">Producto<input value={form.name} onChange={event => setField('name', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Caldo de gallina" /></label>
      <label className="text-sm font-medium">Segmento<input value={form.segment} onChange={event => setField('segment', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Económico / Estándar / Medio / Premium" /></label>
      <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Descripción<input value={form.description} onChange={event => setField('description', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Presa de gallina, fideo, papa, huevo" /></label>
      <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Ingredientes<input value={form.ingredients} onChange={event => setField('ingredients', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Receta base de referencia" /></label>
      <label className="text-sm font-medium">Porción<input value={form.portion} onChange={event => setField('portion', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Plato hondo" /></label>
      <label className="text-sm font-medium">Precio mín. (S/)<input value={form.priceMin || ''} onChange={event => setField('priceMin', Number(event.target.value) || 0)} type="number" min="0" step="0.5" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="0" /></label>
      <label className="text-sm font-medium">Precio máx. (S/)<input value={form.priceMax || ''} onChange={event => setField('priceMax', Number(event.target.value) || 0)} type="number" min="0" step="0.5" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="0" /></label>
      <label className="text-sm font-medium">Precio prom. (S/)<input value={form.pricePromedio || ''} onChange={event => setField('pricePromedio', Number(event.target.value) || 0)} type="number" min="0" step="0.5" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="0" /></label>
      <label className="text-sm font-medium">Hora pico<input value={form.peakHour} onChange={event => setField('peakHour', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="05:00-09:00" /></label>
      <label className="text-sm font-medium">Prep (min)<input value={form.prepMinutes || ''} onChange={event => setField('prepMinutes', Number(event.target.value) || 0)} type="number" min="0" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="10" /></label>
      <label className="text-sm font-medium">Apto delivery<input value={form.deliverySuitability} onChange={event => setField('deliverySuitability', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Alto / Medio / Bajo" /></label>
      <label className="text-sm font-medium">Tipo de local<input value={form.localType} onChange={event => setField('localType', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Caldería, mercado" /></label>
      <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Observación comercial<input value={form.note} onChange={event => setField('note', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Nota comercial" /></label>
    </div>
    <div className="mt-4 flex flex-wrap items-end gap-4">
      <div className="w-40 shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Foto del producto</p>
        <ProductPhoto product={form} />
        <div className="mt-2 flex items-center gap-3">
          <label className="cursor-pointer rounded-md border px-2 py-1.5 text-xs font-semibold text-primary hover:bg-muted">
            Subir foto
            <input type="file" accept="image/*" className="hidden" onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setField('photoUrl', String(reader.result));
              reader.readAsDataURL(file);
            }} />
          </label>
          {form.photoUrl && <button type="button" onClick={() => setField('photoUrl', '')} className="text-xs text-muted-foreground hover:underline">Quitar</button>}
        </div>
      </div>
      <label className="min-w-[220px] flex-1 text-sm font-medium">O pega el enlace de una foto (opcional)
        <input value={form.photoUrl?.startsWith('data:') ? '' : (form.photoUrl ?? '')} onChange={event => setField('photoUrl', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="https://... si no se deja nada se usa una foto referencial por categoría" /></label>
      <button type="button" onClick={() => registerProduct(targetCarta)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Registrar producto</button>
    </div>
  </section>;
  const descriptions: Record<string, string> = {
    Restaurantes: 'Administra comercios, horarios, menús y disponibilidad.',
    Repartidores: 'Controla disponibilidad, rutas y entregas en curso.',
    Clientes: 'Consulta usuarios, direcciones e historial de pedidos.',
    Menú: 'Gestiona productos, precios, extras y disponibilidad.',
    Promociones: 'Configura cupones, descuentos y campañas.',
    Finanzas: 'Supervisa ventas, comisiones y liquidaciones.',
    Cobertura: 'Define zonas, costos de envío y tiempos estimados.',
    Reclamos: 'Da seguimiento a incidencias de pedidos y clientes.',
    Reportes: 'Consulta rendimiento por restaurante, zona y periodo.',
    Configuración: 'Administra datos del negocio, usuarios y alertas.',
  };
  if (section === 'Repartidores') {
    const courierSearchText = courierSearch.trim().toLowerCase();
    const allCouriers = [...couriers, ...importedCouriers];
    const visibleCouriers = allCouriers.filter(item => (courierZone === 'Todas' || item.zones.split(',').some(zone => zone.trim() === courierZone))
      && (item.name + ' ' + item.dni + ' ' + item.phone + ' ' + item.vehicle + ' ' + item.plate + ' ' + item.zones + ' ' + item.shift).toLowerCase().includes(courierSearchText));
    const available = allCouriers.filter(item => /disponible/i.test(item.status)).length;
    const feeByZone = Object.fromEntries(activeZones.map(item => [item.zone, item.fee]));
    return <div className="space-y-5">
      <section className="rounded-lg border bg-background p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Administración · ComeYa</p>
            <h2 className="mt-2 text-2xl font-semibold">Repartidores</h2>
            <p className="mt-1 text-sm text-muted-foreground">{allCouriers.length} repartidores en el padrón · {available} disponibles. Cobertura y tarifa por zona según las 15 zonas de reparto de Puno.</p>
          </div>
          <button type="button" onClick={() => { setCourierForm(emptyCourierForm); setShowCourierForm(!showCourierForm); }} className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{showCourierForm ? 'Cancelar' : 'Agregar'}</button>
        </div>
      </section>
      {showCourierForm && <section className="rounded-lg border bg-background p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium">Nombre completo<input value={courierForm.name} onChange={event => setCourierField('name', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Luis Quispe Mamani" /></label>
          <label className="text-sm font-medium">DNI<input value={courierForm.dni} onChange={event => setCourierField('dni', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="01234567" /></label>
          <label className="text-sm font-medium">Teléfono / WhatsApp<input value={courierForm.phone} onChange={event => setCourierField('phone', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="951 000 000" /></label>
          <label className="text-sm font-medium">Vehículo<select value={courierForm.vehicle} onChange={event => setCourierField('vehicle', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Selecciona</option>{courierVehicles.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-sm font-medium">Placa<input value={courierForm.plate} onChange={event => setCourierField('plate', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="X1-2345 (si aplica)" /></label>
          <label className="text-sm font-medium">Estado<select value={courierForm.status} onChange={event => setCourierField('status', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Selecciona</option>{courierStatuses.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Turno<select value={courierForm.shift} onChange={event => setCourierField('shift', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Selecciona el turno que cubre</option>{courierShifts.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          <div className="text-sm font-medium sm:col-span-2 xl:col-span-3">Zonas que cubre
            <div className="mt-2 flex flex-wrap gap-2">
              {activeZones.map(item => {
                const selected = courierForm.zones.split(',').map(zone => zone.trim()).filter(Boolean);
                const active = selected.includes(item.zone);
                return <button key={item.zone} type="button" onClick={() => setCourierField('zones', (active ? selected.filter(zone => zone !== item.zone) : [...selected, item.zone]).join(', '))} className={'rounded-full border px-3 py-1.5 text-xs font-normal ' + (active ? 'border-primary bg-primary/10 font-semibold text-primary' : 'text-muted-foreground')}>{item.zone} · S/ {item.fee.toFixed(2)}</button>;
              })}
            </div>
          </div>
          <label className="text-sm font-medium">Licencia de conducir<input value={courierForm.license} onChange={event => setCourierField('license', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="N.º o 'no aplica'" /></label>
          <label className="text-sm font-medium">SOAT vigente<input value={courierForm.soat} onChange={event => setCourierField('soat', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Vence 12/2026" /></label>
          <label className="text-sm font-medium">Captación<select value={courierForm.source} onChange={event => setCourierField('source', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Selecciona</option>{courierSources.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <button type="button" onClick={registerCourier} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Registrar repartidor</button>
      </section>}
      <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input value={courierSearch} onChange={event => setCourierSearch(event.target.value)} placeholder="Buscar por nombre, DNI, placa o turno..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <select value={courierZone} onChange={event => setCourierZone(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="Todas">Todas las zonas</option>
          {activeZones.map(item => <option key={item.zone} value={item.zone}>{item.zone}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{visibleCouriers.length} de {allCouriers.length} repartidores</span>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleCouriers.map(item => <article key={item.dni + item.name} className="rounded-lg border bg-background p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.vehicle || 'Vehículo por definir'}{item.plate && ' · ' + item.plate}</p>
              <h4 className="mt-1 font-semibold">{item.name}</h4>
            </div>
            {item.status && <Badge tone={item.status === 'Disponible' ? 'green' : item.status === 'En ruta' ? 'blue' : 'neutral'}>{item.status}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.phone}{item.dni && ' · DNI ' + item.dni}</p>
          {item.shift && <p className="mt-2 text-xs text-muted-foreground"><Clock3 className="mr-1 inline size-3" />{item.shift}</p>}
          {item.lat && item.lng && <a href={'https://www.google.com/maps?q=' + item.lat + ',' + item.lng} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center text-xs font-semibold text-primary hover:underline"><MapPin className="mr-1 size-3" />Ver punto base en mapa</a>}
          {item.zones && <div className="mt-3 flex flex-wrap gap-1">{item.zones.split(',').map(zone => zone.trim()).filter(Boolean).map(zone => <span key={zone} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{zone}{feeByZone[zone] !== undefined && ' · S/ ' + feeByZone[zone].toFixed(2)}</span>)}</div>}
          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            <span>Licencia: <b className="text-foreground">{item.license || 'Por verificar'}</b></span>
            <span>SOAT: <b className="text-foreground">{item.soat || 'Por verificar'}</b></span>
            <span className="col-span-2">Captación: <b className="text-foreground">{item.source || 'Sin registrar'}</b></span>
          </div>
          <button type="button" onClick={() => { setCourierForm(item); setShowCourierForm(true); }} className="mt-3 text-sm font-semibold text-primary">Completar ficha</button>
        </article>)}
      </div>
      {allCouriers.length === 0 && <section className="rounded-lg border bg-background p-5 shadow-sm">
        <p className="text-sm font-semibold">Aún no hay repartidores registrados.</p>
        <p className="mt-1 text-sm text-muted-foreground">El relevamiento de mercado no trae un padrón de repartidores: hoy los restaurantes de Puno llaman a un motorizado conocido y no pagan comisión. La cantera natural son los motorizados independientes y los mototaxistas de paradero, sobre todo para el pico de almuerzo. Usa "Agregar" para ir armando el padrón en campo.</p>
      </section>}
      {allCouriers.length > 0 && visibleCouriers.length === 0 && <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground shadow-sm">No hay repartidores que coincidan con la búsqueda.</p>}
    </div>;
  }
  if (section === 'Restaurantes') {
    const allRestaurants = [...addedRestaurants, ...directoryRestaurants];
    const search = restaurantSearch.trim().toLowerCase();
    const visibleRestaurants = allRestaurants.filter(item => (restaurantZone === 'Todas' || item.zone === restaurantZone)
      && (item.name + ' ' + item.localType + ' ' + item.cuisine + ' ' + item.address + ' ' + item.zone + ' ' + item.segment + ' ' + item.cartas).toLowerCase().includes(search));
    const pendingFieldWork = allRestaurants.filter(item => !item.phone && !item.schedule).length;
    return <div className="space-y-5">
      <section className="rounded-lg border bg-background p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Administración · ComeYa</p>
            <h2 className="mt-2 text-2xl font-semibold">Restaurantes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Padrón de {allRestaurants.length} locales de Puno con tipo, zona, segmento y cartas que trabaja. {pendingFieldWork} siguen sin teléfono ni horario: se completan en campo desde este formulario.</p>
          </div>
          <button type="button" onClick={() => { setRestaurantForm(emptyRestaurantForm); setShowRestaurantForm(!showRestaurantForm); }} className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{showRestaurantForm ? 'Cancelar' : 'Agregar'}</button>
        </div>
      </section>
      {showRestaurantForm && <section className="rounded-lg border bg-background p-5 shadow-sm">
        <label className="text-sm font-medium">Usar un local del padrón como modelo
          <select defaultValue="" onChange={event => { const match = allRestaurants.find(item => item.name === event.target.value); if (match) setRestaurantForm(match); }} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal">
            <option value="" disabled>Selecciona un local modelo (opcional)</option>
            {allRestaurants.map(item => <option key={item.name} value={item.name}>{item.name} · {item.localType}</option>)}
          </select>
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium">Nombre del local<input value={restaurantForm.name} onChange={event => setRestaurantField('name', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Mojsa Restaurante" /></label>
          <label className="text-sm font-medium">Tipo de local<input list="restaurante-tipos" value={restaurantForm.localType} onChange={event => setRestaurantField('localType', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Pollería, chifa, carretilla..." /><datalist id="restaurante-tipos">{restaurantTypes.map(item => <option key={item} value={item} />)}</datalist></label>
          <label className="text-sm font-medium">Cocina / especialidad<input value={restaurantForm.cuisine} onChange={event => setRestaurantField('cuisine', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Novoandina / peruana" /></label>
          <label className="text-sm font-medium sm:col-span-2">Dirección<input value={restaurantForm.address} onChange={event => setRestaurantField('address', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Jr. Lima 635, 2do piso" /></label>
          <label className="text-sm font-medium">Zona<input list="restaurante-zonas" value={restaurantForm.zone} onChange={event => setRestaurantField('zone', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Centro / Plaza de Armas" /><datalist id="restaurante-zonas">{restaurantZones.map(item => <option key={item} value={item} />)}</datalist></label>
          <label className="text-sm font-medium">Segmento<input list="restaurante-segmentos" value={restaurantForm.segment} onChange={event => setRestaurantField('segment', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Económico / Estándar / Medio / Premium" /><datalist id="restaurante-segmentos">{restaurantSegments.map(item => <option key={item} value={item} />)}</datalist></label>
          <label className="text-sm font-medium sm:col-span-2">Cartas que trabaja<input value={restaurantForm.cartas} onChange={event => setRestaurantField('cartas', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Almuerzos, Cenas, Especiales" /></label>
          <label className="text-sm font-medium">¿Menú diario?<select value={restaurantForm.dailyMenu} onChange={event => setRestaurantField('dailyMenu', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Por confirmar</option><option value="Sí">Sí</option><option value="No">No</option></select></label>
          <label className="text-sm font-medium">Precio menú (S/)<input value={restaurantForm.menuPrice} onChange={event => setRestaurantField('menuPrice', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="10" /></label>
          <label className="text-sm font-medium">Rango carta (S/)<input value={restaurantForm.cartaRange} onChange={event => setRestaurantField('cartaRange', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="15-40" /></label>
          <label className="text-sm font-medium">Teléfono<input value={restaurantForm.phone} onChange={event => setRestaurantField('phone', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="951530110" /></label>
          <label className="text-sm font-medium">Horario<input value={restaurantForm.schedule} onChange={event => setRestaurantField('schedule', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="11:00-22:00" /></label>
          <label className="text-sm font-medium">¿Delivery propio?<select value={restaurantForm.ownDelivery} onChange={event => setRestaurantField('ownDelivery', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Por confirmar</option><option value="Sí">Sí</option><option value="No">No</option></select></label>
          <label className="text-sm font-medium">Plataforma actual<input value={restaurantForm.platform} onChange={event => setRestaurantField('platform', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="PideloPuno, WhatsApp, ninguna" /></label>
          <label className="text-sm font-medium">Prioridad ComeYa<select value={restaurantForm.priority} onChange={event => setRestaurantField('priority', event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="">Sin clasificar</option><option value="Alta">Alta</option><option value="Media">Media</option><option value="Baja">Baja</option></select></label>
          <label className="text-sm font-medium sm:col-span-2 xl:col-span-3">Fuente / estado<input value={restaurantForm.source} onChange={event => setRestaurantField('source', event.target.value)} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Visita de campo 22/09, directorio público, referido..." /></label>
        </div>
        <button type="button" onClick={registerRestaurant} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Registrar restaurante</button>
      </section>}
      <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input value={restaurantSearch} onChange={event => setRestaurantSearch(event.target.value)} placeholder="Buscar local, cocina, dirección o carta..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <select value={restaurantZone} onChange={event => setRestaurantZone(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="Todas">Todas las zonas</option>
          {restaurantZones.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{visibleRestaurants.length} de {allRestaurants.length} locales</span>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleRestaurants.map(item => <article key={item.name} className="rounded-lg border bg-background p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.localType || 'Sin clasificar'}</p>
              <h4 className="mt-1 font-semibold">{item.name}</h4>
            </div>
            {item.segment && <Badge tone={item.segment === 'Premium' ? 'blue' : item.segment === 'Económico' ? 'green' : 'coral'}>{item.segment}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.cuisine}</p>
          <p className="mt-2 text-xs text-muted-foreground"><MapPin className="mr-1 inline size-3" />{item.address || 'Dirección por confirmar'} · {item.zone || 'Zona por confirmar'}
            {item.lat && item.lng && <a href={'https://www.google.com/maps?q=' + item.lat + ',' + item.lng} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-primary hover:underline">Ver en mapa</a>}
          </p>
          {item.cartas && <div className="mt-3 flex flex-wrap gap-1">{item.cartas.split(',').map(carta => <span key={carta} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{carta.trim()}</span>)}</div>}
          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            <span>Teléfono: <b className="text-foreground">{item.phone || 'Por levantar'}</b></span>
            <span>Horario: <b className="text-foreground">{item.schedule || 'Por levantar'}</b></span>
            <span>Menú diario: <b className="text-foreground">{item.dailyMenu || 'Por confirmar'}</b></span>
            <span>Delivery propio: <b className="text-foreground">{item.ownDelivery || 'Por confirmar'}</b></span>
            <span>Precio menú: <b className="text-foreground">{item.menuPrice ? 'S/ ' + item.menuPrice : '—'}</b></span>
            <span>Prioridad: <b className="text-foreground">{item.priority || 'Sin clasificar'}</b></span>
          </div>
          {item.source && <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{item.source}</p>}
          <button type="button" onClick={() => { setRestaurantForm(item); setShowRestaurantForm(true); }} className="mt-3 text-sm font-semibold text-primary">Completar ficha</button>
        </article>)}
      </div>
      {visibleRestaurants.length === 0 && <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground shadow-sm">No hay locales que coincidan con la búsqueda.</p>}
    </div>;
  }
  if (section === 'Menú' && selectedCarta) {
    const modelProducts = catalogByCarta[selectedCarta] ?? [];
    const added = addedByCarta[selectedCarta] ?? [];
    const products = [...added, ...modelProducts];
    const categoriesInCarta = [...new Set(modelProducts.map(item => item.category))];
    const zoneContext = cartaSummary.find(item => item.label === selectedCarta)?.zoneContext;
    return <div className="space-y-5">
      <section className="rounded-lg border bg-background p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{selectedCarta}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ficha completa de los {products.length} productos de esta carta, con ingredientes de referencia y clasificación comercial.</p>
            {zoneContext && <p className="mt-2 max-w-3xl text-sm text-foreground">🏔️ <span className="text-muted-foreground">{zoneContext}</span></p>}
          </div>
          <button type="button" onClick={() => { setForm(emptyCartaProductForm); setShowAddForm(!showAddForm); }} className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{showAddForm ? 'Cancelar' : 'Agregar'}</button>
        </div>
      </section>
      {showAddForm && renderAddForm(selectedCarta, modelProducts, categoriesInCarta)}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map(product => <article key={product.category + product.name} className="rounded-lg border bg-background p-4 shadow-sm">
          <ProductPhoto product={product} />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.category}</p>
          <h4 className="mt-1 font-semibold">{product.name}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
          <p className="mt-2 text-xs text-muted-foreground"><b className="font-semibold text-foreground">Ingredientes: </b>{product.ingredients}</p>
          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>Porción: <b className="text-foreground">{product.portion}</b></span>
            <span>Segmento: <b className="text-foreground">{product.segment}</b></span>
            <span>Hora pico: <b className="text-foreground">{product.peakHour}</b></span>
            <span>Prep: <b className="text-foreground">{product.prepMinutes} min</b></span>
            <span>Apto delivery: <b className="text-foreground">{product.deliverySuitability}</b></span>
            <span>Tipo de local: <b className="text-foreground">{product.localType}</b></span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">S/ {product.priceMin.toFixed(2)}–{product.priceMax.toFixed(2)}</span>
            <b>Prom: S/ {product.pricePromedio.toFixed(2)}</b>
          </div>
          {product.note && <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">{product.note}</p>}
          <button type="button" onClick={() => applyAsModel(product)} className="mt-3 text-sm font-semibold text-primary">Usar como modelo</button>
        </article>)}
      </div>
    </div>;
  }
  const resumenModelProducts = catalogByCarta[formCarta] ?? [];
  const resumenCategoryOptions = [...new Set(resumenModelProducts.map(item => item.category))];
  return <div className="space-y-5">
    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Administración · ComeYa</p><h2 className="mt-2 text-2xl font-semibold">{section}</h2><p className="mt-1 text-sm text-muted-foreground">{descriptions[section]}</p></div>
        {section === 'Menú' && <div className="flex shrink-0 items-center gap-2">
          <select value={formCarta} onChange={event => setFormCarta(event.target.value)} className="rounded-md border bg-background px-2 py-2 text-sm font-normal">
            {cartaSummary.map(item => <option key={item.key} value={item.label}>{item.label}</option>)}
          </select>
          <button type="button" onClick={() => { setForm(emptyCartaProductForm); setShowAddForm(!showAddForm); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{showAddForm ? 'Cancelar' : 'Agregar'}</button>
        </div>}
      </div>
    </section>
    {section === 'Menú' && showAddForm && renderAddForm(formCarta, resumenModelProducts, resumenCategoryOptions)}
    {section === 'Menú' && <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Los 3 más consumidos por carta</h3>
      <p className="mt-1 text-sm text-muted-foreground">Productos marcados como ancla o de mayor rotación en el relevamiento de mercado.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartaSummary.map(carta => <div key={carta.key} className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{carta.label}</p>
          <ol className="mt-2 space-y-1.5">
            {(topConsumedByCarta[carta.label] ?? []).map((item, index) => <li key={item.name} className="flex items-baseline gap-2 text-sm">
              <span className="text-xs font-semibold text-muted-foreground">{index + 1}.</span>
              <span className="font-medium">{item.name}</span>
            </li>)}
          </ol>
        </div>)}
      </div>
    </section>}
    {section === 'Menú' && <MarketSummary />}
    {section !== 'Menú' && <ModuleList title={section} description="Gestiona este módulo desde una lista operativa." rows={adminDetailRows[section] ?? []} onAction={(name) => notice(name + ' abierto.')} />}
    {section === 'Configuración' && <section className="rounded-lg border bg-background shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
        <div>
          <h2 className="font-semibold">Registro de archivos fuente</h2>
          <p className="mt-1 text-sm text-muted-foreground">Almacenamiento de datos del programa: cada archivo y hoja que alimenta ComeYa, a dónde llega en el código y qué queda pendiente de levantar. Carga aquí el archivo para dejar constancia de la versión en uso.</p>
          <p className="mt-1 text-xs text-muted-foreground">{dataSources.length + extraSources.length - removedSources.length} fuentes registradas · {dataSources.filter(item => item.state === 'Cargado').length} en uso · {dataSources.filter(item => item.state === 'Pendiente').length} pendientes · {storedFiles.length} archivos guardados en el navegador.</p>
          {importing && <p className="mt-2 text-sm font-semibold text-primary">Leyendo el Excel y actualizando el programa...</p>}
          {dataset && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <p className="font-semibold">Base de datos activa: {dataset.fileName}{dataset.version && ' · ' + dataset.version}</p>
            <p className="mt-1">Importado el {dataset.importedAt} · {dataset.products.length} productos · {dataset.restaurants.length} restaurantes · {dataset.couriers.length} repartidores · {dataset.companies.length} empresas de reparto · {dataset.zones.length} zonas. El menú, el padrón y las zonas de la app ya usan este archivo.</p>
            <button type="button" onClick={() => { clearDataset(); notice('Se volvió a los datos base del proyecto.'); }} className="mt-2 rounded-md border border-emerald-300 px-2 py-1 font-semibold hover:bg-emerald-100">Volver a los datos base</button>
          </div>}
        </div>
        <button type="button" onClick={() => setShowSourceForm(!showSourceForm)} className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{showSourceForm ? 'Cancelar' : 'Cargar archivo nuevo'}</button>
      </div>
      {showSourceForm && <div className="border-b bg-muted/20 p-5">
        {renderSourceFields(sourceForm, patch => setSourceForm(current => ({ ...current, ...patch })))}
        <p className="mt-3 text-xs text-muted-foreground">{newSourceFile
          ? <>Archivo listo para guardar: <b className="text-foreground">{newSourceFile.name}</b> · {formatFileSize(newSourceFile.size)}</>
          : 'Todavía no has adjuntado el archivo.'}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={registerNewSource} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Registrar fuente</button>
          <label className="cursor-pointer rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
            {newSourceFile ? 'Cambiar archivo' : 'Cargar archivo'}
            <input type="file" accept=".xlsx,.xls,.csv,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) { setNewSourceFile(file); setSourceForm(current => ({ ...current, file: current.file.trim() || file.name })); } }} />
          </label>
          {newSourceFile && <button type="button" onClick={() => setNewSourceFile(null)} className="rounded-md border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">Quitar archivo</button>}
          <button type="button" onClick={() => { setShowSourceForm(false); setSourceForm(emptyDataSource); setNewSourceFile(null); }} className="text-sm text-muted-foreground hover:underline">Cancelar</button>
        </div>
      </div>}
      <div className="hidden gap-3 border-b bg-muted/30 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[1.6fr_1.1fr_1.4fr_130px_150px]">
        <span>Archivo</span>
        <span>Hojas</span>
        <span>Alimenta / destino en el código</span>
        <span>Registros</span>
        <span>Estado / carga</span>
      </div>
      <div className="divide-y">
        {[...extraSources, ...dataSources].filter(item => !removedSources.includes(item.id)).map(base => {
          const item = { ...base, ...sourceEdits[base.id] };
          const upload = sourceUploads[item.id];
          const editing = editingSource === item.id && editDraft !== null;
          return <div key={item.id}>
            <div className="grid gap-2 px-5 py-3 lg:grid-cols-[1.6fr_1.1fr_1.4fr_130px_150px] lg:items-center lg:gap-3">
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold">{item.file}</p>
                {upload && <p className="mt-1 break-all text-[11px] text-emerald-700">✓ {upload.fileName} · {formatFileSize(upload.size)} · guardado {upload.uploadedAt}
                  {storedFiles.some(stored => stored.id === item.id) && <button type="button" onClick={() => downloadFile(item.id)} className="ml-2 font-semibold underline">Descargar</button>}
                </p>}
              </div>
              <p className="text-xs text-muted-foreground">{item.sheets}</p>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.feeds}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground/80">→ {item.target}</p>
              </div>
              <p className="text-xs font-medium">{item.records}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={upload ? 'green' : item.state === 'Cargado' ? 'green' : item.state === 'Enlazado' ? 'blue' : 'neutral'}>{upload ? 'Archivo subido' : item.state}</Badge>
                <button type="button" onClick={() => { if (editing) { setEditingSource(null); setEditDraft(null); } else { openSourceEditor(item); } }} className="rounded-md border px-2 py-1 text-xs font-semibold text-primary hover:bg-muted">{editing ? 'Cerrar' : 'Editar'}</button>
              </div>
            </div>
            {editing && editDraft && <div className="border-t bg-muted/20 px-5 py-4">
              {renderSourceFields(editDraft, patch => setEditDraft({ ...editDraft, ...patch }))}
              <p className="mt-3 text-xs text-muted-foreground">{upload
                ? <>Archivo guardado: <b className="text-foreground">{upload.fileName}</b> · {formatFileSize(upload.size)} · {upload.uploadedAt}</>
                : 'Todavía no hay archivo guardado en esta fuente.'}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={saveSourceEdit} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button>
                <label className="cursor-pointer rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                  {upload ? 'Reemplazar archivo' : 'Cargar archivo'}
                  <input type="file" accept=".xlsx,.xls,.csv,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) registerUpload(item.id, file); }} />
                </label>
                {storedFiles.some(stored => stored.id === item.id) && <button type="button" onClick={() => downloadFile(item.id)} className="rounded-md border px-3 py-2 text-sm font-semibold text-primary hover:bg-muted">Descargar</button>}
                {upload && <button type="button" onClick={() => clearSourceUpload(item)} className="rounded-md border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">Quitar archivo</button>}
                <button type="button" onClick={() => deleteSource(item)} className="rounded-md border border-destructive px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">Eliminar del registro</button>
                <button type="button" onClick={() => { setEditingSource(null); setEditDraft(null); }} className="text-sm text-muted-foreground hover:underline">Cancelar</button>
              </div>
            </div>}
          </div>;
        })}
      </div>
      <p className="border-t p-5 text-xs text-muted-foreground">La carga deja constancia del archivo en uso (nombre, peso y fecha). Los datos que muestra la app siguen viniendo de la última extracción procesada: para que un archivo nuevo cambie el menú o el padrón hay que procesarlo.</p>
    </section>}
  </div>;
}

function AdminView({ notice, section, selectedCarta }: { notice: (message: string) => void; section: AdminSection; selectedCarta?: string | null }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'Todos' | Status>('Todos');
  const filtered = useMemo(() => orders.filter((item) => (filter === 'Todos' || item.status === filter) && (item.id + item.customer + item.restaurant).toLowerCase().includes(search.toLowerCase())), [search, filter]);
  if (section === 'Mensajes y soporte') return <DeliveryChat participant="admin" notice={notice} />;
  if (section !== 'Resumen' && section !== 'Pedidos') return <AdminDetailView section={section} notice={notice} selectedCarta={selectedCarta} />;
  const metrics: Array<{ title: string; value: string; trend: string; Icon: typeof Package }> = [
    { title: 'Pedidos del día', value: '128', trend: '↑ 12.3% vs. ayer', Icon: Package },
    { title: 'Ventas totales', value: 'S/ 5,842', trend: '↑ 8.6% vs. ayer', Icon: WalletCards },
    { title: 'Comisión ComeYa', value: 'S/ 876', trend: 'Tasa configurada: 15%', Icon: ShoppingBag },
    { title: 'Tiempo de entrega', value: '32 min', trend: '↓ 4 min vs. ayer', Icon: Clock3 },
  ];
  return <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ title, value, trend, Icon }) => <article key={title} className="rounded-lg border bg-background p-4 shadow-sm"><div className="flex justify-between text-sm text-muted-foreground"><span>{title}</span><Icon className="size-4" /></div><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-emerald-700">{trend}</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]"><article className="rounded-lg border bg-background p-5 shadow-sm"><h2 className="font-semibold">Ritmo de pedidos</h2><p className="text-sm text-muted-foreground">Pedidos procesados durante el día</p><div className="mt-6 flex h-44 items-end gap-2 border-b border-l p-3">{[22, 35, 46, 31, 62, 74, 54, 88, 67, 94, 76, 100].map((height, index) => <div key={index} className="flex-1 rounded-t" style={{ height: height + '%', backgroundColor: '#e34b2e' }} />)}</div></article><article className="rounded-lg border bg-background p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Cobertura de ComeYa</h2><p className="text-sm text-muted-foreground">Miraflores · San Isidro · Surquillo</p></div><Store className="size-5 text-secondary" /></div><div className="mt-5 flex h-44 items-center justify-around rounded-md bg-emerald-50"><Store className="size-9 text-secondary" /><Bike className="size-10 text-primary" /><Users className="size-9 text-secondary" /></div></article></section>
    <ModuleList title="Módulos de ComeYa" description="Accede a cada área de la operación desde una lista clara." rows={adminModules} onAction={(name) => notice('Módulo ' + name + ' abierto.')} />
    <section className="rounded-lg border bg-background shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Pedidos recientes</h2><p className="mt-1 text-sm text-muted-foreground">Busca pedidos, clientes y estados.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido o cliente" className="h-9 rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></div></div><div className="flex gap-5 overflow-x-auto border-b px-5">{(['Todos', 'Nuevo', 'Preparando', 'En camino', 'Entregado'] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={'border-b-2 py-3 text-sm ' + (filter === item ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground')}>{item}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3">Pedido / cliente</th><th className="px-5 py-3">Restaurante</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Repartidor</th><th className="px-5 py-3">Total</th><th className="px-5 py-3" /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t"><td className="px-5 py-3"><b className="text-primary">#{item.id}</b><span className="mt-1 block text-xs text-muted-foreground">{item.customer}</span></td><td className="px-5 py-3 font-medium">{item.restaurant}</td><td className="px-5 py-3"><Badge tone={toneFor(item.status)}>{item.status}</Badge></td><td className="px-5 py-3">{item.courier}</td><td className="px-5 py-3 font-semibold">{item.total}</td><td className="px-5 py-3 text-right"><button type="button" onClick={() => notice('Pedido ' + item.id + ' abierto.')} className="text-primary hover:underline">Ver detalle →</button></td></tr>)}</tbody></table></div></section>
  </div>;
}

function RestaurantDashboard({ notice, onNavigate }: { notice: (message: string) => void; onNavigate: (section: RestaurantTab) => void }) {
  const [open] = useState(true);
  const [readyOrders, setReadyOrders] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('comeya.ready-orders.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    window.localStorage.setItem('comeya.ready-orders.v1', JSON.stringify(readyOrders));
  }, [readyOrders]);

  const pendingOrders = orders.filter((item) => (
    item.status === 'Preparando' || item.status === 'Nuevo'
  ) && !readyOrders.includes(item.id));
  const markReady = (id: string) => {
    setReadyOrders((current) => [...current, id]);
    notice('Pedido ' + id + ' marcado como listo.');
  };
  const goTo = (section: RestaurantTab) => {
    onNavigate(section);
    notice(section + ' abierto.');
  };

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-lg border bg-background shadow-sm">
      <div className="hidden gap-4 border-b bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[260px_100px_110px_130px]">
        <span>Elemento</span>
        <span>Estado</span>
        <span>Detalle</span>
        <span />
      </div>

      <div className="divide-y">
        <div className="bg-muted/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedidos por preparar</div>
        {pendingOrders.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[260px_100px_110px_130px] lg:items-center lg:gap-4">
          <div className="min-w-0">
            <p className="font-semibold">#{item.id} · {item.customer}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.restaurant} · {item.total}</p>
          </div>
          <Badge tone={toneFor(item.status)}>{item.status}</Badge>
          <span className="text-sm text-muted-foreground">Pago virtual</span>
          <button type="button" onClick={() => markReady(item.id)} className="w-fit rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Marcar listo</button>
        </div>)}
        {pendingOrders.length === 0 && <p className="px-5 py-4 text-sm text-emerald-700">No hay pedidos pendientes.</p>}

        <div className="bg-muted/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gestión del restaurante</div>
        <div className="grid gap-3 px-5 py-4 lg:grid-cols-[260px_100px_110px_130px] lg:items-center lg:gap-4">
          <div>
            <p className="font-semibold">Menú</p>
            <p className="mt-1 text-xs text-muted-foreground">Productos, precios y disponibilidad.</p>
          </div>
          <Badge tone="green">18 activos</Badge>
          <span className="text-sm text-muted-foreground">2 agotados</span>
          <button type="button" onClick={() => goTo('Menú')} className="w-fit rounded-md bg-muted px-3 py-2 text-sm font-semibold">Gestionar menú</button>
        </div>
        <div className="grid gap-3 px-5 py-4 lg:grid-cols-[260px_100px_110px_130px] lg:items-center lg:gap-4">
          <div>
            <p className="font-semibold">Horarios y disponibilidad</p>
            <p className="mt-1 text-xs text-muted-foreground">Define cuándo aceptas pedidos.</p>
          </div>
          <Badge tone={open ? 'green' : 'neutral'}>{open ? 'Abierto' : 'Cerrado'}</Badge>
          <span className="text-sm text-muted-foreground">Lun–Dom · 11:00 a 23:00</span>
          <button type="button" onClick={() => goTo('Horarios')} className="w-fit rounded-md bg-muted px-3 py-2 text-sm font-semibold">Editar horarios</button>
        </div>
      </div>
    </section>
  </div>;
}

type RestaurantTab = 'Pedidos' | 'Chat y contacto' | 'Menú' | 'Horarios' | 'Finanzas y pagos' | 'Promociones' | 'Perfil y documentos' | 'Registro';

type RestaurantMenuProduct = {
  id: string;
  menuName: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  available: boolean;
};

type MenuCategoryOption = { id: string; name: string };
type ApiMenuProduct = Omit<RestaurantMenuProduct, 'category' | 'price'> & { category: MenuCategoryOption; price: string | number };
type ApiMenuReference = { id: string; name: string; minimumPrice: string | number; maximumPrice: string | number; suggestedPrice: string | number };
type ApiMenuCategory = MenuCategoryOption & { references: ApiMenuReference[] };

const restaurantMenuStorageKey = 'comeya.restaurant-menu.v1';
const menuCategories = ['Entradas y piqueos', 'Sopas', 'Platos principales', 'Pollo a la brasa', 'Ceviches y pescados', 'Chifa', 'Pastas', 'Sándwiches y hamburguesas', 'Ensaladas', 'Postres', 'Bebidas sin alcohol', 'Bebidas con alcohol', 'Combos y familiares'];


function RestaurantMenuEditor({ notice }: { notice: (message: string) => void }) {
  const [products, setProducts] = useState<RestaurantMenuProduct[]>(() => {
    const fallback = [
      { id: 'pollo-familiar', menuName: 'Carta principal', name: 'Pollo a la brasa familiar', description: 'Pollo entero con papas y ensalada.', category: 'Platos principales', price: 58.9, available: true },
      { id: 'lomo-saltado', menuName: 'Carta principal', name: 'Lomo saltado', description: 'Lomo salteado con arroz y papas fritas.', category: 'Platos principales', price: 32.5, available: true },
      { id: 'inca-kola', menuName: 'Carta principal', name: 'Inca Kola 500 ml', description: 'Bebida gaseosa personal de 500 ml.', category: 'Bebidas sin alcohol', price: 5, available: false },
    ];
    try { const stored = window.localStorage.getItem(restaurantMenuStorageKey); return stored ? JSON.parse(stored) as RestaurantMenuProduct[] : fallback; } catch { return fallback; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState('Carta principal');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Platos principales');
  const [price, setPrice] = useState('');
  const [apiCategories, setApiCategories] = useState<MenuCategoryOption[]>([]);
  useEffect(() => { window.localStorage.setItem(restaurantMenuStorageKey, JSON.stringify(products)); }, [products]);
  useEffect(() => {
    const openForm = () => setShowForm(true);
    window.addEventListener('comeya-menu-open-form', openForm);
    return () => window.removeEventListener('comeya-menu-open-form', openForm);
  }, []);
  useEffect(() => {
    void Promise.all([
      axiosInstance.get<ApiMenuProduct[]>('/comeya/restaurants/la-brasa-de-don-pepe/menu', { noLoader: true } as never),
      axiosInstance.get<ApiMenuCategory[]>('/comeya/catalog', { noLoader: true } as never),
    ]).then(([productsResponse, catalogResponse]) => {
      setProducts(productsResponse.data.map(product => ({ ...product, price: Number(product.price), category: product.category.name })));
      setApiCategories(catalogResponse.data.map(item => ({ id: item.id, name: item.name })));
    }).catch(() => undefined);
  }, []);

  const resetForm = () => { setEditingId(null); setMenuName('Carta principal'); setName(''); setDescription(''); setCategory('Platos principales'); setPrice(''); setShowForm(false); };
  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) { notice('Ingresa un nombre y un precio válido.'); return; }
    const categoryId = apiCategories.find(item => item.name === category)?.id;
    if (categoryId) {
      try {
        const response = editingId
          ? await axiosInstance.patch<ApiMenuProduct>(`/comeya/restaurants/la-brasa-de-don-pepe/menu/${editingId}`, { menuName: menuName.trim(), name: name.trim(), description: description.trim(), categoryId, price: numericPrice }, { noLoader: true } as never)
          : await axiosInstance.post<ApiMenuProduct>('/comeya/restaurants/la-brasa-de-don-pepe/menu', { menuName: menuName.trim(), name: name.trim(), description: description.trim(), categoryId, price: numericPrice, available: true }, { noLoader: true } as never);
        const saved = { ...response.data, price: Number(response.data.price), category: response.data.category.name };
        setProducts(current => editingId ? current.map(product => product.id === editingId ? saved : product) : [...current, saved]);
        notice(editingId ? 'Producto actualizado en la base de datos.' : 'Producto registrado en la base de datos.');
        resetForm();
        return;
      } catch {
        notice('No se pudo guardar en el servidor; se conserva en este navegador.');
      }
    }
    if (editingId) setProducts(current => current.map(product => product.id === editingId ? { ...product, menuName: menuName.trim(), name: name.trim(), description: description.trim(), category, price: numericPrice } : product));
    else setProducts(current => [...current, { id: crypto.randomUUID(), menuName: menuName.trim(), name: name.trim(), description: description.trim(), category, price: numericPrice, available: true }]);
    notice(editingId ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.');
    resetForm();
  };
  const editProduct = (product: RestaurantMenuProduct) => { setEditingId(product.id); setMenuName(product.menuName); setName(product.name); setDescription(product.description ?? ''); setCategory(product.category); setPrice(String(product.price)); setShowForm(true); };
  const toggleAvailability = async (id: string) => {
    const product = products.find(item => item.id === id);
    if (!product) return;
    try {
      if (apiCategories.length) await axiosInstance.patch(`/comeya/restaurants/la-brasa-de-don-pepe/menu/${id}`, { available: !product.available }, { noLoader: true } as never);
    } catch { notice('No se pudo actualizar el servidor; se conserva el cambio local.'); }
    setProducts(current => current.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  const registrationFields = (title: string, withSearch: boolean) => <>
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{title}</p>
    <div className={'mt-4 grid gap-6 sm:grid-cols-2 ' + (withSearch ? 'xl:grid-cols-[1fr_1fr_1fr_.65fr_1.65fr]' : 'xl:grid-cols-[1fr_1.15fr_1.15fr_1fr_.65fr_1.65fr]')}>
      <label className="text-sm font-medium">Menú<input value={menuName} onChange={event => setMenuName(event.target.value)} required className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Carta almuerzo" /></label>
      {!withSearch && <label className="text-sm font-medium">Producto<input value={name} onChange={event => setName(event.target.value)} required className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Ají de gallina" /></label>}
      <label className="text-sm font-medium">Categoría{withSearch
        ? <p className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-normal text-foreground">{category || 'Busca un producto arriba'}</p>
        : <select value={category} onChange={event => setCategory(event.target.value)} className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal">{(apiCategories.length ? apiCategories.map(item => item.name) : menuCategories).map(item => <option key={item}>{item}</option>)}</select>}</label>
      <label className="text-sm font-medium">Carta<p className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-normal text-foreground">{categoryToCarta[category] ?? 'Sin clasificar'}</p></label>
      <label className="text-sm font-medium">Precio (S/){withSearch
        ? <p className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-normal text-foreground">{price ? `S/ ${Number(price).toFixed(2)}` : 'Busca un producto arriba'}</p>
        : <input value={price} onChange={event => setPrice(event.target.value)} required min="0.01" step="0.01" type="number" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="0.00" />}</label>
      <label className="text-sm font-medium">Descripción{withSearch
        ? <p className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-normal text-foreground">{description || 'Ingredientes, tamaño o acompañamientos'}</p>
        : <input value={description} onChange={event => setDescription(event.target.value)} maxLength={500} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ingredientes, tamaño o acompañamientos" />}</label>
    </div>
  </>;

  return <div className="space-y-3">
    {showForm && <form onSubmit={saveProduct} className="space-y-8 rounded-lg border bg-background p-8 shadow-sm">
      {registrationFields('Productos a base', true)}
      {registrationFields('Productos a registrar', false)}
      <div className="flex gap-3"><button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{editingId ? 'Guardar cambios' : 'Registrar producto'}</button><button type="button" onClick={resetForm} className="rounded-md border px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" onClick={resetForm} className="rounded-md bg-muted px-4 py-2 text-sm font-semibold">Cambiar producto</button></div>
    </form>}
    <section className="rounded-lg border bg-background shadow-sm"><div className="grid grid-cols-[1fr_1.4fr_auto_auto_auto_auto] gap-6 border-b bg-muted/30 px-8 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Menú</span><span>Producto</span><span>Precio</span><span>Estado</span><span>Disponibilidad</span><span>Editar</span></div>{products.map(product => <div key={product.id} className="grid grid-cols-[1fr_1.4fr_auto_auto_auto_auto] items-center gap-6 border-b px-8 py-6 last:border-0"><div className="font-semibold">{product.menuName}</div><div><p className="font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{product.description || product.category}</p><p className="mt-1 text-xs text-muted-foreground">{product.category}</p></div><span className="font-semibold">S/ {product.price.toFixed(2)}</span><Badge tone={product.available ? 'green' : 'neutral'}>{product.available ? 'Disponible' : 'Agotado'}</Badge><button type="button" onClick={() => toggleAvailability(product.id)} className="text-sm font-semibold text-primary">{product.available ? 'Pausar' : 'Activar'}</button><button type="button" onClick={() => editProduct(product)} className="text-sm font-semibold text-primary">Editar</button></div>)}</section>
  </div>;
}

function RestaurantRegistration({ notice, onNavigate }: { notice: (message: string) => void; onNavigate: (section: RestaurantTab) => void }) {
  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    notice('Registro enviado para revisión. Ya puedes configurar la operación de tu restaurante.');
    onNavigate('Pedidos');
  };

  return <div className="space-y-5">
    <form onSubmit={submitRegistration} className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="border-b pb-4">
        <h3 className="font-semibold">Datos del propietario</h3>
        <p className="mt-1 text-sm text-muted-foreground">Usaremos estos datos como contacto principal del restaurante.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Nombres y apellidos<input required autoComplete="name" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. María Pérez" /></label>
        <label className="text-sm font-medium">Correo de contacto<input required type="email" autoComplete="email" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="correo@ejemplo.com" /></label>
        <label className="text-sm font-medium">Teléfono<input required type="tel" autoComplete="tel" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="999 999 999" /></label>
        <label className="text-sm font-medium">Cargo<select required defaultValue="" className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="" disabled>Selecciona una opción</option><option>Propietario(a)</option><option>Representante legal</option><option>Administrador(a) autorizado(a)</option></select></label>
      </div>

      <div className="mt-7 border-b pb-4">
        <h3 className="font-semibold">Datos del restaurante</h3>
        <p className="mt-1 text-sm text-muted-foreground">Esta información se mostrará a los clientes una vez aprobada.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Nombre comercial<input required className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. La Brasa de Don Pepe" /></label>
        <label className="text-sm font-medium">RUC<input required inputMode="numeric" minLength={11} maxLength={11} className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="11 dígitos" /></label>
        <label className="text-sm font-medium">Tipo de cocina<select required defaultValue="" className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="" disabled>Selecciona una opción</option><option>Comida criolla</option><option>Pollo a la brasa</option><option>Comida saludable</option><option>Otro</option></select></label>
        <label className="text-sm font-medium">Distrito<select required defaultValue="" className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="" disabled>Selecciona una opción</option><option>Miraflores</option><option>San Isidro</option><option>Surquillo</option></select></label>
        <label className="text-sm font-medium sm:col-span-2">Dirección del local<input required autoComplete="street-address" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Av., calle, número y referencia" /></label>
      </div>

      <div className="mt-6 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">En el siguiente paso podrás subir tu RUC, licencia de funcionamiento y carta del menú.</div>
      <label className="mt-4 flex items-start gap-2 text-sm"><input required type="checkbox" className="mt-1" /><span>Confirmo que estoy autorizado(a) para registrar este restaurante.</span></label>
      <div className="mt-5 flex flex-wrap gap-3"><button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Enviar registro</button><button type="button" onClick={() => onNavigate('Pedidos')} className="rounded-md border px-4 py-2 text-sm font-semibold">Ya tengo un restaurante registrado</button></div>
    </form>
  </div>;
}

function RestaurantSchedule({ notice }: { notice: (message: string) => void }) {
  const [open, setOpen] = useState(true);
  return <div className="space-y-5">
    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Disponibilidad</p>
      <h2 className="mt-2 text-2xl font-semibold">Horarios de atención</h2>
      <p className="mt-1 text-sm text-muted-foreground">Los cambios se aplican inmediatamente a los clientes.</p>
      <div className="mt-5 flex items-center justify-between rounded-lg border p-4">
        <div><b>Recibir pedidos</b><p className="text-sm text-muted-foreground">{open ? 'El restaurante aparece abierto.' : 'El restaurante aparece cerrado.'}</p></div>
        <button type="button" onClick={() => { setOpen(!open); notice(open ? 'Pedidos pausados.' : 'Pedidos habilitados.'); }} className={'rounded-full px-4 py-2 text-sm font-semibold ' + (open ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>{open ? 'Abierto' : 'Cerrado'}</button>
      </div>
    </section>
    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Horario semanal</h3>
      <div className="mt-4 divide-y">{['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => <div key={day} className="flex items-center justify-between py-3"><span>{day}</span><div className="flex items-center gap-2"><input defaultValue="11:00" className="w-24 rounded-md border px-2 py-1.5 text-sm" /><span>a</span><input defaultValue="23:00" className="w-24 rounded-md border px-2 py-1.5 text-sm" /></div></div>)}</div>
      <button type="button" onClick={() => notice('Horarios guardados correctamente.')} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar horarios</button>
    </section>
    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Franjas de mercado en Puno por tipo de carta</h3>
      <p className="mt-1 text-sm text-muted-foreground">Según el levantamiento de {cartaProductsTotal} productos del mercado gastronómico de Puno. Úsalo de referencia para decidir cuándo abrir cada carta.</p>
      <div className="mt-4 divide-y">
        {cartaSummary.map(carta => <div key={carta.key} className="grid gap-1 py-3 sm:grid-cols-[200px_120px_1fr] sm:items-center sm:gap-4">
          <span className="font-semibold">{carta.label}</span>
          <Badge tone={carta.key === 'jugos-rapido' ? 'green' : 'neutral'}>{carta.schedule}</Badge>
          <span className="text-sm text-muted-foreground">{carta.scheduleNote}</span>
        </div>)}
      </div>
      <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Oportunidad: PideloPuno, el competidor con más locales afiliados, recién abre a las 11:00. Entre 05:00 y 09:00 no hay competencia formal en Puno.</p>
    </section>
  </div>;
}

function RestaurantFinance({ notice }: { notice: (message: string) => void }) {
  return <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-3">{[['Ventas del mes', 'S/ 18,420'], ['Comisiones', 'S/ 2,763'], ['Por liquidar', 'S/ 1,284']].map(([title, value]) => <article key={title} className="rounded-lg border bg-background p-5 shadow-sm"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-emerald-700">Actualizado hoy</p></article>)}</section>
    <ModuleList title="Movimientos recientes" description="Ventas y liquidaciones del restaurante." rows={[["Liquidación semanal", "15 pedidos entregados", "Pendiente", "Ver detalle"], ["Ventas de hoy", "24 pedidos procesados", "Activo", "Descargar"], ["Comisión ComeYa", "Tasa aplicada: 15%", "Activo", "Ver detalle"]]} onAction={(name) => notice(name + ' abierto.')} />

    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Comisión ComeYa por segmento</h3>
      <p className="mt-1 text-sm text-muted-foreground">Definida en la base de datos de mercado; depende del segmento de cada producto.</p>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={commissionSegments.map(item => ({ name: item.segment, pct: Number((item.pct * 100).toFixed(0)) }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => value + '%'} />
            <Bar dataKey="pct" fill="#e34b2e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Tarifa de delivery por zona de Puno</h3>
      <p className="mt-1 text-sm text-muted-foreground">Lo que paga el cliente por el envío, según distancia desde el centro.</p>
      <div style={{ height: deliveryZones.length * 26 }} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...deliveryZones].sort((a, b) => a.fee - b.fee)} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="zone" width={170} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value) => 'S/ ' + Number(value).toFixed(2)} />
            <Bar dataKey="fee" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Simulador de margen por pedido</h3>
      <p className="mt-1 text-sm text-muted-foreground">Mueve los supuestos y mira cuánto recibe cada parte y cuántos pedidos diarios necesita ComeYa para su punto de equilibrio.</p>
      <div className="mt-4"><OrderMarginSimulator /></div>
    </section>
  </div>;
}

function RestaurantPromotions({ promo, setPromo, notice }: { promo: 'active' | 'draft'; setPromo: (value: 'active' | 'draft') => void; notice: (message: string) => void }) {
  return <div className="space-y-5">
    <section className="flex items-center justify-between rounded-lg border bg-background p-5 shadow-sm"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Ventas y crecimiento</p><h2 className="mt-2 text-2xl font-semibold">Promociones</h2><p className="mt-1 text-sm text-muted-foreground">Atrae clientes con descuentos controlados.</p></div><button type="button" onClick={() => { setPromo('draft'); notice('Nueva promoción creada como borrador.'); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Crear promoción</button></section>
    <ModuleList title="Promociones activas" description="Códigos y beneficios visibles para tus clientes." rows={[["BIENVENIDA10", "10% para la primera compra", promo === 'active' ? 'Vigente' : 'Borrador', "Editar"], ["ENVIOGRATIS", "Envío sin costo desde S/ 50", "Vigente", "Editar"]]} onAction={(name) => { setPromo('active'); notice(name + ' activada.'); }} />
    <section className="rounded-lg border bg-background p-5 shadow-sm">
      <h3 className="font-semibold">Ideas de combo según datos de mercado</h3>
      <p className="mt-1 text-sm text-muted-foreground">Combos reales relevados en Puno. Los tickets bajos (carretillas, jugos) solo son rentables vendidos en combo.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {comboIdeas.map(combo => <article key={combo.name} className="rounded-md border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{combo.carta} · {combo.category}</p>
          <p className="mt-1 font-semibold">{combo.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">Precio de mercado: <b className="text-foreground">S/ {combo.price.toFixed(2)}</b></p>
          <button type="button" onClick={() => notice(combo.name + ' agregado como borrador de promoción.')} className="mt-3 text-sm font-semibold text-primary">Usar como promoción</button>
        </article>)}
      </div>
    </section>
  </div>;
}

function RestaurantOperations({ tab, notice, onNavigate }: { tab: RestaurantTab; notice: (message: string) => void; onNavigate: (section: RestaurantTab) => void }) {
  const [promo, setPromo] = useState<'active' | 'draft'>('active');
  if (tab === 'Registro') return <RestaurantRegistration notice={notice} onNavigate={onNavigate} />;
  if (tab === 'Chat y contacto') return <DeliveryChat participant="restaurant" notice={notice} />;
  if (tab === 'Pedidos') return <RestaurantDashboard notice={notice} onNavigate={onNavigate} />;
  if (tab === 'Menú') return <RestaurantMenuEditor notice={notice} />;
  if (tab === 'Horarios') return <RestaurantSchedule notice={notice} />;
  if (tab === 'Finanzas y pagos') return <RestaurantFinance notice={notice} />;
  if (tab === 'Promociones') return <RestaurantPromotions promo={promo} setPromo={setPromo} notice={notice} />;
  return <div className="space-y-5"><section className="rounded-lg border bg-background p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Configuración del negocio</p><h2 className="mt-2 text-2xl font-semibold">Perfil y documentos</h2><p className="mt-1 text-sm text-muted-foreground">Mantén actualizados los datos que ven tus clientes.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre comercial<input defaultValue="La Brasa de Don Pepe" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">RUC<input defaultValue="20601234567" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Teléfono<input defaultValue="999 888 777" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Dirección<input defaultValue="Av. Larco 210, Miraflores" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label></div><button type="button" onClick={() => notice('Perfil guardado correctamente.')} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button></section><section className="rounded-lg border bg-background p-5 shadow-sm"><h3 className="font-semibold">Documentos</h3><p className="mt-1 text-sm text-muted-foreground">RUC y licencia de funcionamiento verificados.</p><Badge tone="green">Documentación vigente</Badge></section></div>;
}

function RestaurantView({ activeSection, notice }: { activeSection?: string; notice: (message: string) => void }) {
  const [selectedSection, setSelectedSection] = useState(activeSection ?? currentComeyaSection);
  useEffect(() => {
    setActiveComeyaSection = setSelectedSection;
    const handleSection = (event: Event) => setSelectedSection((event as CustomEvent<string>).detail);
    window.addEventListener('comeya-section', handleSection);
    return () => { window.removeEventListener('comeya-section', handleSection); setActiveComeyaSection = null; };
  }, []);
  const tab = (['Pedidos', 'Chat y contacto', 'Menú', 'Horarios', 'Finanzas y pagos', 'Promociones', 'Perfil y documentos', 'Registro'] as RestaurantTab[]).includes(selectedSection as RestaurantTab) ? selectedSection as RestaurantTab : 'Pedidos';
  return <RestaurantOperations tab={tab} notice={notice} onNavigate={setSelectedSection} />;
}

function DriverDashboard({ notice }: { notice: (message: string) => void }) {
  return <div className="space-y-5"><section className="flex flex-col gap-3 rounded-lg border bg-background p-5 shadow-sm md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">App del repartidor</p><h2 className="mt-2 text-2xl font-semibold">Hola, Luis</h2><p className="mt-1 text-sm text-muted-foreground">Gestiona tus entregas y llega rápido a cada cliente.</p></div><div className="flex flex-wrap gap-2"><Badge tone="green">● Disponible</Badge><button type="button" onClick={() => notice('Registro del repartidor iniciado.')} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Registrar repartidor</button></div></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Entregas de hoy', '12'], ['Ganancia estimada', 'S/ 86.40'], ['Tiempo conectado', '4 h 20 min'], ['Calificación', '4.9 ★']].map(([title, value]) => <article key={title} className="rounded-lg border bg-background p-4 shadow-sm"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-3 text-2xl font-bold">{value}</p></article>)}</section><section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]"><article className="rounded-lg border bg-background p-5 shadow-sm"><h2 className="font-semibold">Entrega actual</h2><p className="mt-1 text-sm text-muted-foreground">Pedido asignado a tu ruta.</p><div className="mt-4 rounded-lg border p-4"><Badge tone="blue">EN CAMINO</Badge><h3 className="mt-3 font-semibold">#CY-1048 · La Brasa de Don Pepe</h3><p className="mt-1 text-sm text-muted-foreground">Recoger en Av. Larco 210 · entregar en Miraflores</p><b className="mt-3 block text-sm text-emerald-700">Pago virtual: Tarjeta · S/ 48.90</b><div className="mt-4 rounded-md bg-emerald-50 p-5 text-center text-primary">📍　━━━━　🏍️　━━━━　📍</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => notice('Pedido marcado como recogido.')} className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">Marcar recogido</button><button type="button" onClick={() => notice('Pedido marcado como entregado.')} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Marcar entregado</button></div></div></article><article className="rounded-lg border bg-background p-5 shadow-sm"><h2 className="font-semibold">Próximas entregas</h2><p className="mt-1 text-sm text-muted-foreground">Orden sugerido por cercanía.</p><div className="mt-4 divide-y">{[['CY-1047 · Sazón Criollo', 'San Isidro · 18 min', 'Pago virtual: Yape / Plin'], ['CY-1045 · Verde & Fresco', 'Surquillo · 22 min', 'Pago virtual: Tarjeta']].map(([name, zone, payment]) => <div key={name} className="py-4"><b>{name}</b><span className="mt-1 block text-xs text-muted-foreground">{zone}</span><span className="mt-1 block text-xs text-muted-foreground">{payment}</span></div>)}</div></article></section><ModuleList title="Módulos del repartidor" description="Gestiona tu operación y mantén tu cuenta lista para recibir entregas." rows={driverModules} onAction={(name) => notice('Módulo ' + name + ' abierto.')} /></div>;
}

type DriverTab = 'Mis entregas' | 'Chat y contacto' | 'Rutas y zonas' | 'Ganancias' | 'Disponibilidad' | 'Perfil y documentos' | 'Ayuda y soporte' | 'Registro';

function DriverRegistration({ notice, onNavigate }: { notice: (message: string) => void; onNavigate: (section: DriverTab) => void }) {
  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    notice('Registro enviado para revisión. Completa tus documentos para empezar a recibir entregas.');
    onNavigate('Mis entregas');
  };

  return <div className="space-y-5">
    <form onSubmit={submitRegistration} className="rounded-lg border bg-background p-5 shadow-sm">
      <div className="border-b pb-4">
        <h3 className="font-semibold">Datos personales</h3>
        <p className="mt-1 text-sm text-muted-foreground">Serán el contacto operativo de tu cuenta.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Nombres y apellidos<input required autoComplete="name" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. Luis Ramírez" /></label>
        <label className="text-sm font-medium">DNI o carnet de extranjería<input required inputMode="numeric" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Documento de identidad" /></label>
        <label className="text-sm font-medium">Correo de contacto<input required type="email" autoComplete="email" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="correo@ejemplo.com" /></label>
        <label className="text-sm font-medium">Teléfono<input required type="tel" autoComplete="tel" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="999 999 999" /></label>
      </div>

      <div className="mt-7 border-b pb-4">
        <h3 className="font-semibold">Licencia y vehículo</h3>
        <p className="mt-1 text-sm text-muted-foreground">Necesitamos confirmar cómo realizarás los repartos.</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Tipo de vehículo<select required defaultValue="" className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="" disabled>Selecciona una opción</option><option>Moto</option><option>Bicicleta</option><option>Auto</option></select></label>
        <label className="text-sm font-medium">Placa del vehículo<input required className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Ej. ABC-123" /></label>
        <label className="text-sm font-medium">Número de licencia<input required className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" placeholder="Número de licencia vigente" /></label>
        <label className="text-sm font-medium">Zona preferida<select required defaultValue="" className="mt-2 block w-full rounded-md border bg-background px-3 py-2 font-normal"><option value="" disabled>Selecciona una opción</option><option>Miraflores</option><option>San Isidro</option><option>Surquillo</option></select></label>
      </div>

      <div className="mt-6 rounded-md bg-muted/50 p-4 text-sm text-muted-foreground">En el siguiente paso podrás subir tu documento de identidad, licencia y SOAT vigente.</div>
      <label className="mt-4 flex items-start gap-2 text-sm"><input required type="checkbox" className="mt-1" /><span>Confirmo que los datos y documentos presentados son válidos.</span></label>
      <div className="mt-5 flex flex-wrap gap-3"><button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Enviar registro</button><button type="button" onClick={() => onNavigate('Mis entregas')} className="rounded-md border px-4 py-2 text-sm font-semibold">Ya tengo una cuenta de repartidor</button></div>
    </form>
  </div>;
}

function DeliveryChat({ participant, notice }: { participant: 'admin' | 'restaurant' | 'driver' | 'client'; notice: (message: string) => void }) {
  const conversation = participant === 'client'
    ? { eyebrow: 'Comunicación de tu pedido', title: 'Chat con tu repartidor', description: 'Coordina la entrega de #CY-1048 directamente con Luis.', contactTitle: 'Contacto del repartidor', contactName: 'Luis Ramírez', contactRole: 'Repartidor asignado' }
    : participant === 'restaurant'
      ? { eyebrow: 'Comunicación del pedido', title: 'Chat con cliente y repartidor', description: 'Coordina la entrega de #CY-1048 con Valeria y el repartidor asignado.', contactTitle: 'Contacto de entrega', contactName: 'Valeria Mendoza', contactRole: 'Cliente' }
      : participant === 'admin'
        ? { eyebrow: 'Seguimiento de operación', title: 'Chat del pedido #CY-1048', description: 'Supervisa la coordinación entre el cliente, el restaurante y el repartidor.', contactTitle: 'Contacto del cliente', contactName: 'Valeria Mendoza', contactRole: 'Cliente' }
        : { eyebrow: 'Comunicación de entrega', title: 'Chat y contacto con el cliente', description: 'Coordina la entrega de #CY-1048 sin compartir tu número personal.', contactTitle: 'Contacto de entrega', contactName: 'Valeria Mendoza', contactRole: 'Cliente' };
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, author: 'Valeria Mendoza', text: 'Hola, ¿me avisas cuando estés cerca?', time: '12:26', mine: false },
    { id: 2, author: 'Tú', text: 'Claro, ya estoy en camino. Te escribiré al llegar.', time: '12:27', mine: true },
  ]);
  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages(current => [...current, { id: Date.now(), author: 'Tú', text, time: new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), mine: true }]);
    setDraft('');
  };

  return <div className="space-y-5">
    <section className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-background p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">{conversation.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold">{conversation.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{conversation.description}</p>
      </div>
      <Badge tone="blue">Pedido en camino</Badge>
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="border-b px-5 py-4"><b>{conversation.contactName}</b><span className="mt-1 block text-xs text-muted-foreground">Pedido #CY-1048 · La Brasa de Don Pepe</span></div>
        <div className="flex-1 space-y-4 bg-muted/20 p-5">{messages.map(message => <div key={message.id} className={'flex ' + (message.mine ? 'justify-end' : 'justify-start')}><div className={'max-w-[80%] rounded-lg px-4 py-3 text-sm ' + (message.mine ? 'bg-primary text-primary-foreground' : 'bg-background shadow-sm')}><p>{message.text}</p><span className={'mt-1 block text-[11px] ' + (message.mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{message.author} · {message.time}</span></div></div>)}</div>
        <form onSubmit={sendMessage} className="flex gap-3 border-t p-4"><input value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder={'Escribe un mensaje para ' + conversation.contactName.split(' ')[0]} /><button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Enviar</button></form>
      </section>

      <aside className="h-fit rounded-lg border bg-background p-5 shadow-sm">
        <h2 className="font-semibold">{conversation.contactTitle}</h2>
        <div className="mt-4 space-y-4 text-sm"><div><p className="text-muted-foreground">{conversation.contactRole}</p><b>{conversation.contactName}</b></div><div><p className="text-muted-foreground">Dirección</p><b>Miraflores · entrega coordinada</b></div><div><p className="text-muted-foreground">Pedido</p><b>#CY-1048 · S/ 48.90</b></div></div>
        <div className="mt-5 grid gap-2"><button type="button" onClick={() => notice('Llamada segura al cliente iniciada.')} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Llamar al cliente</button><button type="button" onClick={() => notice('Ubicación de entrega compartida en el chat.')} className="rounded-md border px-3 py-2 text-sm font-semibold">Compartir mi ubicación</button></div>
        <p className="mt-4 text-xs text-muted-foreground">ComeYa protege los datos de contacto: la comunicación está vinculada únicamente a este pedido.</p>
      </aside>
    </div>
  </div>;
}

function DriverView({ activeSection, notice }: { activeSection?: string; notice: (message: string) => void }) {
  const [selected, setSelected] = useState<DriverTab>((activeSection ?? 'Mis entregas') as DriverTab);
  useEffect(() => { setActiveComeyaSection = (section) => setSelected(section as DriverTab); return () => { setActiveComeyaSection = null; }; }, []);
  if (selected === 'Registro') return <DriverRegistration notice={notice} onNavigate={setSelected} />;
  if (selected === 'Mis entregas') return <DriverDashboard notice={notice} />;
  if (selected === 'Chat y contacto') return <DeliveryChat participant="driver" notice={notice} />;
  if (selected === 'Rutas y zonas') return <div className="space-y-5"><section className="rounded-lg border bg-background p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Operación en ruta</p><h2 className="mt-2 text-2xl font-semibold">Rutas y zonas</h2><p className="mt-1 text-sm text-muted-foreground">Consulta las zonas habilitadas y el orden recomendado.</p><div className="mt-5 grid gap-4 sm:grid-cols-3">{[['Miraflores', 'Alta demanda', '12 entregas'], ['San Isidro', 'Demanda media', '8 entregas'], ['Surquillo', 'Disponible', '5 entregas']].map(([zone, status, count]) => <article key={zone} className="rounded-lg border p-4"><MapPin className="size-5 text-primary" /><h3 className="mt-3 font-semibold">{zone}</h3><p className="text-sm text-muted-foreground">{status}</p><b className="mt-2 block text-sm">{count}</b><button type="button" onClick={() => notice('Ruta de ' + zone + ' seleccionada.')} className="mt-3 rounded-md bg-muted px-3 py-2 text-sm font-semibold">Ver ruta</button></article>)}</div></section></div>;
  if (selected === 'Ganancias') return <div className="space-y-5"><section className="grid gap-4 sm:grid-cols-3">{[['Ganancia de hoy', 'S/ 86.40'], ['Esta semana', 'S/ 524.80'], ['Por liquidar', 'S/ 214.20']].map(([title, value]) => <article key={title} className="rounded-lg border bg-background p-5 shadow-sm"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}</section><ModuleList title="Historial de pagos" description="Revisa tus entregas y liquidaciones." rows={[["Liquidación semanal", "12 entregas completadas", "Pendiente", "Ver detalle"], ["Bonificación por zona", "Miraflores · alta demanda", "Activo", "Ver detalle"]]} onAction={(name) => notice(name + ' abierto.')} /></div>;
  if (selected === 'Disponibilidad') return <div className="space-y-5"><section className="rounded-lg border bg-background p-5 shadow-sm"><h2 className="text-2xl font-semibold">Disponibilidad</h2><p className="mt-1 text-sm text-muted-foreground">Define cuándo quieres recibir entregas.</p><div className="mt-5 flex items-center justify-between rounded-lg border p-4"><div><b>Estado de conexión</b><p className="text-sm text-muted-foreground">Disponible para nuevas entregas</p></div><button type="button" onClick={() => notice('Disponibilidad actualizada.')} className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Disponible</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Inicio<input defaultValue="08:00" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Fin<input defaultValue="18:00" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label></div><button type="button" onClick={() => notice('Horario guardado.')} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar horario</button></section></div>;
  if (selected === 'Perfil y documentos') return <div className="space-y-5"><section className="rounded-lg border bg-background p-5 shadow-sm"><h2 className="text-2xl font-semibold">Perfil y documentos</h2><p className="mt-1 text-sm text-muted-foreground">Tus datos son visibles para restaurantes y clientes.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Nombre<input defaultValue="Luis Ramírez" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Teléfono<input defaultValue="999 111 222" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label><label className="text-sm font-medium">Vehículo<input defaultValue="Moto · ABC-123" className="mt-2 block w-full rounded-md border px-3 py-2 font-normal" /></label></div><button type="button" onClick={() => notice('Perfil actualizado.')} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Guardar cambios</button></section><section className="rounded-lg border bg-background p-5 shadow-sm"><h3 className="font-semibold">Documentos</h3><p className="mt-1 text-sm text-muted-foreground">Licencia y SOAT vigentes.</p><Badge tone="green">Verificados</Badge></section></div>;
  return <div className="space-y-5"><section className="rounded-lg border bg-background p-5 shadow-sm"><h2 className="text-2xl font-semibold">Ayuda y soporte</h2><p className="mt-1 text-sm text-muted-foreground">Reporta una incidencia y recibe seguimiento.</p><textarea placeholder="Describe lo que ocurrió" className="mt-5 min-h-32 w-full rounded-md border p-3 text-sm" /><button type="button" onClick={() => notice('Solicitud enviada al equipo de soporte.')} className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Enviar solicitud</button></section></div>;
}

function ClientShoppingView({ notice }: { notice: (message: string) => void }) {
  const [category, setCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [payment, setPayment] = useState<'card' | 'yape'>('card');
  const [confirmed, setConfirmed] = useState(false);
  const visible = customerRestaurants.filter((item) => (category === 'Todos' || item.category === category) && (item.name + item.category).toLowerCase().includes(search.toLowerCase()));
  const cartItems = customerRestaurants.filter((item) => cart[item.name]).map((item) => ({ ...item, quantity: cart[item.name] }));
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = cartItems.length ? 4.9 : 0;
  const total = subtotal + delivery;
  const add = (name: string) => setCart((current) => ({ ...current, [name]: (current[name] || 0) + 1 }));
  const change = (name: string, delta: number) => setCart((current) => { const next = Math.max(0, (current[name] || 0) + delta); const copy = { ...current }; if (next === 0) delete copy[name]; else copy[name] = next; return copy; });
  return <div className="space-y-5"><section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">c</span><b className="text-lg">ComeYa</b><span className="text-sm text-muted-foreground"><MapPin className="mr-1 inline size-4" />Entregar en Miraflores · Cambiar</span></div><button type="button" onClick={() => setCheckout(true)} disabled={!cartItems.length} className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">🛒 Carrito ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})</button></section>{!checkout && !confirmed && <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><section><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Vista del cliente</p><h2 className="mt-2 text-3xl font-semibold">¿Qué quieres comer hoy?</h2><p className="mt-1 text-sm text-muted-foreground">Encuentra tus restaurantes favoritos y recibe tu pedido donde estés.</p><div className="relative mt-5 max-w-2xl"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar restaurante o tipo de comida..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></div><div className="mt-5 flex flex-wrap gap-2">{['Todos', 'Criollo', 'Saludable'].map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={'rounded-full border px-4 py-2 text-sm ' + (category === item ? 'border-primary/30 bg-primary/10 font-semibold text-primary' : 'text-muted-foreground')}>{item}</button>)}</div><h2 className="mt-8 font-semibold">Restaurantes cerca de ti</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <article key={item.name} className="rounded-lg border bg-background p-3 shadow-sm"><div className="grid h-24 place-items-center rounded-md bg-orange-100 text-4xl">{item.emoji}</div><h3 className="mt-3 font-semibold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p><button type="button" onClick={() => { add(item.name); notice(item.name + ' agregado al carrito.'); }} className="mt-3 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">Agregar al pedido</button></article>)}</div></section><aside className="h-fit rounded-lg border bg-background p-5 shadow-sm"><div className="flex items-center justify-between border-b pb-4"><div><h2 className="font-semibold">Tu carrito</h2><p className="text-xs text-muted-foreground">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} productos</p></div><ShoppingBag className="size-5 text-secondary" /></div><div className="divide-y">{cartItems.length ? cartItems.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 py-4"><div><b className="text-sm">{item.name}</b><span className="mt-1 block text-xs text-muted-foreground">S/ {item.price.toFixed(2)} por unidad</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => change(item.name, -1)} className="grid size-6 place-items-center rounded border"><Minus className="size-3" /></button><span className="text-sm">{item.quantity}</span><button type="button" onClick={() => change(item.name, 1)} className="grid size-6 place-items-center rounded border"><Plus className="size-3" /></button></div></div>) : <p className="py-5 text-sm text-muted-foreground">Agrega un restaurante para empezar.</p>}</div><div className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between text-muted-foreground"><span>Subtotal</span><b>S/ {subtotal.toFixed(2)}</b></div><div className="flex justify-between text-muted-foreground"><span>Envío</span><b>S/ {delivery.toFixed(2)}</b></div><div className="flex justify-between border-t pt-3 text-base"><span>Total</span><b>S/ {total.toFixed(2)}</b></div></div><button type="button" onClick={() => setCheckout(true)} disabled={!cartItems.length} className="mt-4 w-full rounded-md bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Ir a pagar</button></aside></div>}{checkout && !confirmed && <section className="mx-auto max-w-2xl rounded-lg border bg-background p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Finalizar pedido</p><h2 className="mt-2 text-xl font-semibold">Revisa y paga tu pedido</h2></div><button type="button" onClick={() => setCheckout(false)} className="text-sm text-muted-foreground">Volver</button></div><div className="mt-5 flex gap-2 text-xs"><Badge tone="coral">1. Pedido</Badge><Badge tone={payment === 'card' ? 'blue' : 'neutral'}>2. Pago</Badge><Badge tone="neutral">3. Confirmación</Badge></div><div className="mt-5 rounded-md bg-muted/50 p-4">{cartItems.map((item) => <div key={item.name} className="flex justify-between py-1 text-sm"><span>{item.quantity} × {item.name}</span><b>S/ {(item.price * item.quantity).toFixed(2)}</b></div>)}<div className="mt-3 flex justify-between border-t pt-3 font-semibold"><span>Total</span><span>S/ {total.toFixed(2)}</span></div></div><h3 className="mt-6 font-semibold">Forma de pago</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPayment('card')} className={'rounded-md border p-3 text-left text-sm ' + (payment === 'card' ? 'border-primary bg-primary/5' : '')}><b>Tarjeta</b><span className="mt-1 block text-xs text-muted-foreground">Pago virtual seguro</span></button><button type="button" onClick={() => setPayment('yape')} className={'rounded-md border p-3 text-left text-sm ' + (payment === 'yape' ? 'border-primary bg-primary/5' : '')}><b>Yape / Plin</b><span className="mt-1 block text-xs text-muted-foreground">Escanea el código QR</span></button></div>{payment === 'card' ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><input className="rounded-md border px-3 py-2 text-sm sm:col-span-2" placeholder="Número de tarjeta ···· 4242" /><input className="rounded-md border px-3 py-2 text-sm" placeholder="MM/AA" /><input className="rounded-md border px-3 py-2 text-sm" placeholder="CVV" /></div> : <div className="mt-3 rounded-md border bg-muted/30 p-5 text-center"><div className="mx-auto grid size-28 place-items-center border-8 border-foreground text-3xl">▦</div><p className="mt-2 text-xs text-muted-foreground">Escanea para pagar S/ {total.toFixed(2)}</p></div>}<button type="button" onClick={() => { setConfirmed(true); notice('Pedido confirmado y enviado al restaurante.'); }} className="mt-5 w-full rounded-md bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground">Confirmar y pagar</button></section>}{confirmed && <section className="mx-auto max-w-2xl rounded-lg border bg-background p-8 text-center shadow-sm"><div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check /></div><h2 className="mt-4 text-2xl font-semibold">¡Pedido confirmado!</h2><p className="mt-2 text-sm text-muted-foreground">Tu pedido fue enviado al restaurante. Tiempo estimado: 25–35 minutos.</p><button type="button" onClick={() => { setConfirmed(false); setCheckout(false); setCart({}); }} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Volver a restaurantes</button></section>}</div>;
}

function ClientView({ notice }: { notice: (message: string) => void }) {
  const [section, setSection] = useState<'restaurantes' | 'chat'>('restaurantes');

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setSection('restaurantes')} className={'rounded-md border px-4 py-2 text-sm font-semibold ' + (section === 'restaurantes' ? 'border-primary bg-primary/10 text-primary' : 'bg-background')}>Restaurantes</button>
      <button type="button" onClick={() => setSection('chat')} className={'rounded-md border px-4 py-2 text-sm font-semibold ' + (section === 'chat' ? 'border-primary bg-primary/10 text-primary' : 'bg-background')}>Chat con repartidor</button>
    </div>
    {section === 'chat' ? <DeliveryChat participant="client" notice={notice} /> : <ClientShoppingView notice={notice} />}
  </div>;
}

const Comeya = () => {
  const [role, setRole] = useState<Role>('admin');
  const [adminSection, setAdminSection] = useState<AdminSection>('Pedidos');
  const [notice, setNotice] = useState('');
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600); };
  return <main className="min-h-screen bg-muted/70"><style>{comeyaResponsiveCss}</style><div className="comeya-shell flex min-h-screen"><ComeyaSidebar role={role} activeSection={adminSection} onNotice={showNotice} onSelect={(item) => { if (role === 'admin' && (sidebarItems.admin as string[]).includes(item)) setAdminSection(item as AdminSection); }} onRoleChange={setRole} /><div className="comeya-content min-w-0 flex-1 p-3 sm:p-4 md:p-6"><div className="mx-auto max-w-[1500px] space-y-5"><header className="comeya-header flex flex-wrap items-center justify-between gap-4 border-b pb-5 text-left"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Módulo integrado · Dhyrium</p><h1 className="mt-2 text-2xl font-semibold">{role === 'client' ? 'Vista del cliente' : 'ComeYa · ' + roleLabels[role]}</h1><p className="mt-1 text-sm text-muted-foreground">Gestiona la operación de pedidos, restaurantes y entregas desde un solo lugar.</p></div></header>{role === 'admin' && <AdminView notice={showNotice} section={adminSection} />}{role === 'restaurant' && <RestaurantView notice={showNotice} />}{role === 'driver' && <DriverView notice={showNotice} />}{role === 'client' && <ClientView notice={showNotice} />}</div></div></div>{notice && <div className="fixed bottom-5 right-5 z-50 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">{notice}</div>}</main>;
};

const ComeyaFixed = () => {
  void Comeya;
  const [role, setRole] = useState<Role>('admin');
  const [section, setSection] = useState('Pedidos');
  const [notice, setNotice] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [selectedCarta, setSelectedCarta] = useState<string | null>(null);

  const showNotice = (message: string) => {
    if (message === 'Registro del repartidor iniciado.') {
      currentComeyaSection = 'Registro';
      setSection('Registro');
      return;
    }
    if (message.endsWith(' abierto.')) {
      setSelectedRecord(message.slice(0, -' abierto.'.length));
      return;
    }
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const changeRole = (nextRole: Role) => {
    const initialSection: Record<Role, string> = {
      admin: 'Pedidos',
      restaurant: 'Registro',
      driver: 'Registro',
      client: '',
    };
    setRole(nextRole);
    currentComeyaSection = initialSection[nextRole];
    setSection(initialSection[nextRole]);
    setSelectedCarta(null);
  };

  const registrationContext = role === 'restaurant' && section === 'Registro'
    ? { title: 'Registra tu restaurante en ComeYa', description: 'Completa los datos del dueño y del negocio. Después podrás administrar pedidos, menú, horarios y pagos desde tu panel.' }
    : role === 'driver' && section === 'Registro'
      ? { title: 'Regístrate como repartidor', description: 'Registra tus datos, tu licencia y vehículo. Una vez revisados, podrás recibir entregas desde tu panel.' }
      : null;
  const restaurantRegistration = role === 'restaurant' && section === 'Registro';

  const sectionContext: { title: string; description: string } | null = (() => {
    if (registrationContext) return null;
    const contexts: Record<Role, Record<string, { title: string; description: string }>> = {
      admin: {
        Resumen: { title: 'Resumen operativo', description: 'Vista general de la operación.' },
        Pedidos: { title: 'Pedidos', description: 'Supervisa estados y asignaciones.' },
        Restaurantes: { title: 'Restaurantes', description: 'Gestiona negocios afiliados.' },
        Repartidores: { title: 'Repartidores', description: 'Consulta disponibilidad y cobertura.' },
        Clientes: { title: 'Clientes', description: 'Administra cuentas y solicitudes.' },
        'Mensajes y soporte': { title: 'Mensajes y soporte', description: 'Atiende conversaciones activas.' },
        Menú: { title: 'Menú', description: 'Revisa productos y disponibilidad.' },
        Promociones: { title: 'Promociones', description: 'Controla campañas vigentes.' },
        Finanzas: { title: 'Finanzas', description: 'Revisa ingresos y liquidaciones.' },
        Cobertura: { title: 'Cobertura', description: 'Consulta zonas de operación.' },
        Reclamos: { title: 'Reclamos', description: 'Da seguimiento a incidencias.' },
        Reportes: { title: 'Reportes', description: 'Analiza indicadores del negocio.' },
        Configuración: { title: 'Configuración', description: 'Ajusta opciones de ComeYa.' },
      },
      restaurant: {
        Pedidos: { title: 'Pedidos', description: 'Gestiona órdenes y preparación.' },
        'Chat y contacto': { title: 'Chat y contacto', description: 'Coordina entregas con el cliente.' },
        Menú: { title: 'Menú y disponibilidad', description: 'Administra productos, precios y stock.' },
        Horarios: { title: 'Horarios', description: 'Define cuándo recibir pedidos.' },
        'Finanzas y pagos': { title: 'Finanzas y pagos', description: 'Consulta ventas y liquidaciones.' },
        Promociones: { title: 'Promociones', description: 'Crea campañas para tus clientes.' },
        'Perfil y documentos': { title: 'Perfil y documentos', description: 'Mantén vigente la información del local.' },
      },
      driver: {
        'Mis entregas': { title: 'Mis entregas', description: 'Revisa pedidos asignados a tu ruta.' },
        'Chat y contacto': { title: 'Chat y contacto', description: 'Coordina la entrega con el cliente.' },
        'Rutas y zonas': { title: 'Rutas y zonas', description: 'Organiza tu zona de cobertura.' },
        Ganancias: { title: 'Ganancias', description: 'Consulta tus ingresos estimados.' },
        Disponibilidad: { title: 'Disponibilidad', description: 'Indica cuándo puedes recibir pedidos.' },
        'Perfil y documentos': { title: 'Perfil y documentos', description: 'Mantén tus datos y documentos vigentes.' },
        'Ayuda y soporte': { title: 'Ayuda y soporte', description: 'Encuentra asistencia para tu operación.' },
      },
      client: {},
    };
    return contexts[role][section] ?? null;
  })();

  const headerFacts: Array<{ label: string; value: string }> = (() => {
    if (registrationContext || role !== 'restaurant') return [];
    const factsBySection: Record<string, Array<{ label: string; value: string }>> = {
      Pedidos: [{ label: 'Por preparar', value: '2' }, { label: 'Ventas hoy', value: 'S/ 1,284' }, { label: 'Preparación', value: '18 min' }, { label: 'Calificación', value: '4.8 ★' }],
      'Chat y contacto': [{ label: 'Pedido activo', value: '#CY-1048' }, { label: 'Estado', value: 'En ruta' }],
      Menú: [{ label: 'Productos activos', value: '18' }, { label: 'Agotados', value: '2' }],
      Horarios: [{ label: 'Estado', value: 'Abierto' }, { label: 'Atención', value: '11:00–23:00' }],
      'Finanzas y pagos': [{ label: 'Ventas del mes', value: 'S/ 18,420' }, { label: 'Por liquidar', value: 'S/ 1,284' }],
      Promociones: [{ label: 'Promociones vigentes', value: '2' }],
      'Perfil y documentos': [{ label: 'Documentación', value: 'Vigente' }],
    };
    return factsBySection[section] ?? [];
  })();

  return <main className="min-h-screen bg-muted/70">
    <style>{comeyaResponsiveCss}</style>
    <div className="comeya-shell flex min-h-screen">
      <ComeyaSidebar
        role={role}
        activeSection={section}
        onNotice={() => undefined}
        onSelect={(item) => { setSection(item); setSelectedCarta(null); }}
        onRoleChange={changeRole}
      />
      <div className="comeya-content min-w-0 flex-1 p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <header className="comeya-header flex flex-wrap items-center justify-start gap-5 border-b border-border/80 px-1 py-3 text-left lg:flex-nowrap">
            <div className="flex shrink-0 items-center gap-5">
              <div className={'pr-5 ' + (registrationContext ? '' : 'border-r border-border')}><ComeyaBrand /></div>
              {!registrationContext && <>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">{role === 'client' ? 'Cliente' : roleLabels[role]}</h1>
                {!sectionContext && <p className="mt-1 text-sm text-muted-foreground">Gestiona la operación de pedidos, restaurantes y entregas desde un solo lugar.</p>}
              </div></>}
            </div>
            {sectionContext && <div className="flex min-w-[140px] flex-1 items-center justify-center border-l border-border px-3 text-center">
              <h2 className="whitespace-nowrap text-base font-semibold tracking-tight">{sectionContext.title}</h2>
            </div>}
            {registrationContext && <div className="flex min-w-0 flex-1 items-center border-l border-border pl-5">
              <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">{registrationContext.title}</h2>
              {!restaurantRegistration && <p className="mt-1 text-sm text-muted-foreground">{registrationContext.description}</p>}
              {restaurantRegistration && <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-semibold text-foreground">La Brasa de Don Pepe</span>
                <span className="text-muted-foreground">Local registrado</span>
              </div>}
              </div>
            </div>}
            {restaurantRegistration && <div className="flex shrink-0 items-center gap-2">
              <Badge tone="green">● Abierto ahora</Badge>
              <button type="button" onClick={() => showNotice('Completa el formulario para registrar otro local.')} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Registrar otro local</button>
            </div>}
            {role === 'restaurant' && section === 'Menú' && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('comeya-menu-open-form'))} className="shrink-0 rounded-md border px-3 py-2 text-sm font-semibold text-primary">Registrar menú</button>}
            {headerFacts.length > 0 && <div className="comeya-header-facts ml-auto flex max-w-full shrink-0 items-center gap-5">
              {headerFacts.map((fact, index) => <div key={fact.label} className="flex items-center gap-2 text-left">
                <span className={'size-2 rounded-full ' + (index === 0 ? 'bg-orange-500' : index === 1 ? 'bg-emerald-500' : index === 2 ? 'bg-sky-500' : 'bg-amber-400')} aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">{fact.label}</p>
                  <p className="mt-0.5 whitespace-nowrap text-sm font-bold text-foreground">{fact.value}</p>
                </div>
              </div>)}
            </div>}
          </header>
          {role === 'admin' && section === 'Menú' && <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedCarta(null)} className={'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold text-primary ' + (!selectedCarta ? 'border-primary bg-primary/10' : '')}>Resumen</button>
            {cartaSummary.map(item => <button key={item.key} type="button" onClick={() => setSelectedCarta(item.label)} className={'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold text-primary ' + (selectedCarta === item.label ? 'border-primary bg-primary/10' : '')}>{item.label}</button>)}
          </div>}
          {role === 'admin' && <AdminView notice={showNotice} section={section as AdminSection} selectedCarta={selectedCarta} />}
          {role === 'restaurant' && <RestaurantView key={section} activeSection={section} notice={showNotice} />}
          {role === 'driver' && <DriverView key={section} activeSection={section} notice={showNotice} />}
          {role === 'client' && <ClientView notice={showNotice} />}
          {selectedRecord && <section className="rounded-lg border border-primary/30 bg-background p-5 shadow-sm" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Detalle operativo</p>
                <h2 className="mt-2 text-xl font-semibold">{selectedRecord}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Consulta y continúa la gestión de este registro desde su ficha.</p>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-md border px-3 py-2 text-sm font-semibold">Cerrar</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-muted/50 p-3"><b className="text-sm">Estado</b><span className="mt-1 block text-sm text-muted-foreground">Registro seleccionado</span></div>
              <div className="rounded-md bg-muted/50 p-3"><b className="text-sm">Actualización</b><span className="mt-1 block text-sm text-muted-foreground">Consulta en curso</span></div>
              <div className="rounded-md bg-muted/50 p-3"><b className="text-sm">Siguiente paso</b><span className="mt-1 block text-sm text-muted-foreground">Editar datos cuando la API esté disponible</span></div>
            </div>
          </section>}
        </div>
      </div>
    </div>
    {notice && <div className="fixed bottom-5 right-5 z-50 rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg">{notice}</div>}
  </main>;
};

export default ComeyaFixed;
