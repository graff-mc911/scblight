const DB_NAME = 'scb-offline';
const DB_VERSION = 1;

const STORES = {
  invoices: 'invoices',
  clients: 'clients',
  receipts: 'receipts',
  syncQueue: 'syncQueue',
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.invoices)) {
        const s = db.createObjectStore(STORES.invoices, { keyPath: 'id' });
        s.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.clients)) {
        const s = db.createObjectStore(STORES.clients, { keyPath: 'id' });
        s.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.receipts)) {
        const s = db.createObjectStore(STORES.receipts, { keyPath: 'id' });
        s.createIndex('user_id', 'user_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const s = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
        s.createIndex('table', 'table', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGetAll<T>(storeName: string, indexName?: string, indexValue?: IDBValidKey): Promise<T[]> {
  return openDB().then(
    (db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = indexName && indexValue !== undefined
        ? store.index(indexName).getAll(indexValue)
        : store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    })
  );
}

function idbPut(storeName: string, value: unknown): Promise<void> {
  return openDB().then(
    (db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    })
  );
}

function idbPutAll(storeName: string, values: unknown[]): Promise<void> {
  return openDB().then(
    (db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      values.forEach((v) => store.put(v));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    })
  );
}

function idbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  return openDB().then(
    (db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    })
  );
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

export const offlineStore = {
  getInvoices: (userId: string) =>
    idbGetAll<Record<string, unknown>>(STORES.invoices, 'user_id', userId),
  saveInvoices: (invoices: unknown[]) => idbPutAll(STORES.invoices, invoices),
  deleteInvoice: (id: string) => idbDelete(STORES.invoices, id),

  getClients: (userId: string) =>
    idbGetAll<Record<string, unknown>>(STORES.clients, 'user_id', userId),
  saveClients: (clients: unknown[]) => idbPutAll(STORES.clients, clients),

  getReceipts: (userId: string) =>
    idbGetAll<Record<string, unknown>>(STORES.receipts, 'user_id', userId),
  saveReceipts: (receipts: unknown[]) => idbPutAll(STORES.receipts, receipts),

  enqueueMutation: (item: Omit<SyncQueueItem, 'id'>) =>
    idbPut(STORES.syncQueue, { ...item, timestamp: Date.now() }),
  getSyncQueue: () => idbGetAll<SyncQueueItem>(STORES.syncQueue),
  removeSyncItem: (id: number) => idbDelete(STORES.syncQueue, id),
};
