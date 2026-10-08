// Guarda el archivo completo que se sube desde el registro de archivos fuente.
// Usa IndexedDB porque un .xlsx pesa cientos de KB y no entra en localStorage:
// así el archivo sigue ahí al recargar la página y se puede volver a descargar.

const DB_NAME = 'comeya-archivos';
const STORE = 'fuentes';
const DB_VERSION = 1;

export type StoredFile = {
  id: string;
  fileName: string;
  size: number;
  savedAt: string;
  blob: Blob;
};

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const runTransaction = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
};

export const saveFile = async (id: string, file: File) => {
  const stored: StoredFile = {
    id,
    fileName: file.name,
    size: file.size,
    savedAt: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
    blob: file.slice(0, file.size, file.type),
  };
  await runTransaction('readwrite', store => store.put(stored));
};

export const deleteFile = async (id: string) => {
  await runTransaction('readwrite', store => store.delete(id));
};

export const listFiles = async (): Promise<StoredFile[]> => {
  try {
    return await runTransaction<StoredFile[]>('readonly', store => store.getAll() as IDBRequest<StoredFile[]>);
  } catch {
    return [];
  }
};

export const downloadFile = async (id: string) => {
  const files = await listFiles();
  const stored = files.find(file => file.id === id);
  if (!stored) return false;
  const url = URL.createObjectURL(stored.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = stored.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
};
