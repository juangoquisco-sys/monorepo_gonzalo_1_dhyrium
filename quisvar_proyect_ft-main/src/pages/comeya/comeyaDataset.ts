// Guarda el Excel importado para que la app trabaje con esos datos en vez de los estáticos.
// Se persiste en localStorage: sobrevive al refresh y al reinicio del navegador hasta que se cargue otro archivo.
import { useEffect, useState } from 'react';
import { fullCatalogByCarta, type FullCatalogProduct } from './comeyaFullCatalog';
import { restaurantDirectory, type ComeyaRestaurant } from './comeyaRestaurants';
import { cartaSummary, categoryToCarta, deliveryZones, type DeliveryZone } from './comeyaMarketData';
import type { ComeyaCourier } from './comeyaCouriers';
import type { ComeyaDataset, DeliveryCompany } from './comeyaExcelImport';

const STORAGE_KEY = 'comeya.dataset.v1';
const DATASET_EVENT = 'comeya-dataset-changed';

export const readStoredDataset = (): ComeyaDataset | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as ComeyaDataset : null;
  } catch {
    return null;
  }
};

export const saveDataset = (dataset: ComeyaDataset) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
  } catch {
    // El archivo puede exceder la cuota del navegador: se sigue usando en memoria hasta recargar.
  }
  window.dispatchEvent(new CustomEvent(DATASET_EVENT, { detail: dataset }));
};

export const clearDataset = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sin acción
  }
  window.dispatchEvent(new CustomEvent(DATASET_EVENT, { detail: null }));
};

export function useComeyaDataset() {
  const [dataset, setDataset] = useState<ComeyaDataset | null>(readStoredDataset);

  useEffect(() => {
    const onChange = (event: Event) => setDataset((event as CustomEvent<ComeyaDataset | null>).detail);
    window.addEventListener(DATASET_EVENT, onChange);
    return () => window.removeEventListener(DATASET_EVENT, onChange);
  }, []);

  const products = dataset?.products?.length ? dataset.products : null;
  const catalogByCarta = products ? groupByCarta(products) : fullCatalogByCarta;
  const restaurants = dataset?.restaurants?.length ? dataset.restaurants : restaurantDirectory;
  const zones = dataset?.zones?.length ? dataset.zones : deliveryZones;
  const couriers: ComeyaCourier[] = dataset?.couriers ?? [];
  const companies: DeliveryCompany[] = dataset?.companies ?? [];

  return { dataset, catalogByCarta, restaurants, zones, couriers, companies };
}

// Reparte los productos importados en las 7 cartas usando el mapa de categoría → carta.
function groupByCarta(products: FullCatalogProduct[]): Record<string, FullCatalogProduct[]> {
  const grouped: Record<string, FullCatalogProduct[]> = {};
  cartaSummary.forEach(carta => { grouped[carta.label] = []; });
  products.forEach(product => {
    const carta = categoryToCarta[product.category];
    if (carta && grouped[carta]) grouped[carta].push(product);
  });
  // Si el Excel trae categorías nuevas que aún no están mapeadas, no se pierden: van a la primera carta vacía conocida.
  const mapped = new Set(Object.values(grouped).flat());
  const orphans = products.filter(product => !mapped.has(product));
  if (orphans.length) grouped['Sin clasificar'] = orphans;
  return grouped;
}

export type { ComeyaRestaurant, ComeyaCourier, DeliveryZone, DeliveryCompany, ComeyaDataset };
