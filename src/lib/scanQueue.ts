import { ScannedReceiptData } from './receiptOCR';

const DB_NAME = 'scb-scan-queue';
const DB_VERSION = 1;
const STORE = 'items';

export type ScanQueueStatus =
  | 'queued'
  | 'uploading'
  | 'recognizing'
  | 'pending_upload'
  | 'ready'
  | 'failed'
  | 'synced';

export interface ScanQueueItem {
  id: string;
  createdAt: number;
  updatedAt: number;
  fileName: string;
  mimeType: string;
  /** Raw file bytes persisted for offline / retry */
  blob: ArrayBuffer;
  status: ScanQueueStatus;
  /** Prefer Wi‑Fi: hold upload while on cellular if set */
  wifiOnly: boolean;
  fileUrl?: string;
  ocrData?: Omit<ScannedReceiptData, 'detectedFields'> & { detectedFields: string[] };
  error?: string;
  previewUrl?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('status', 'status', { unique: false });
        s.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function arrayBufferToFile(buf: ArrayBuffer, fileName: string, mimeType: string): File {
  return new File([buf], fileName, { type: mimeType || 'application/octet-stream' });
}

export const scanQueue = {
  async list(): Promise<ScanQueueItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const items = (req.result as ScanQueueItem[]).sort((a, b) => b.createdAt - a.createdAt);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async get(id: string): Promise<ScanQueueItem | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as ScanQueueItem | undefined);
      req.onerror = () => reject(req.error);
    });
  },

  async put(item: ScanQueueItem): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...item, updatedAt: Date.now() });
    await txDone(tx);
  },

  async remove(id: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  },

  async enqueue(file: File, opts?: { wifiOnly?: boolean }): Promise<ScanQueueItem> {
    const blob = await fileToArrayBuffer(file);
    const item: ScanQueueItem = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fileName: file.name || `scan-${Date.now()}.jpg`,
      mimeType: file.type || 'image/jpeg',
      blob,
      status: 'queued',
      wifiOnly: !!opts?.wifiOnly,
    };
    await scanQueue.put(item);
    return item;
  },
};

/** Rough cellular detection — used only as a soft Wi‑Fi preference. */
export function isLikelyCellular(): boolean {
  const conn = (navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string; saveData?: boolean };
  }).connection;
  if (!conn) return false;
  if (conn.type === 'cellular') return true;
  if (conn.saveData) return true;
  return false;
}

export function serializeOcr(data: ScannedReceiptData): ScanQueueItem['ocrData'] {
  return {
    ...data,
    detectedFields: Array.from(data.detectedFields || []),
  };
}

export function deserializeOcr(data: NonNullable<ScanQueueItem['ocrData']>): ScannedReceiptData {
  return {
    ...data,
    detectedFields: new Set(data.detectedFields || []),
  };
}
